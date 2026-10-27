//stories visitors write are saved in their own browser under this key
const MY_STORIES_KEY = 'myStories';

let allTemples = [];
let allStories = [];

document.addEventListener('DOMContentLoaded', async function () {
    //remove copies saved by the old one-hour cache
    localStorage.removeItem('temple-stories-data-data/temples.json');
    localStorage.removeItem('temple-stories-data-data/stories.json');

    const [temples, siteStories] = await Promise.all([
        fetchJson('data/temples.json'),
        fetchJson('data/stories.json')
    ]);

    allTemples = temples;
    allStories = [...siteStories, ...getMyStories()];

    setupFilters();
    displayStories(allStories, allTemples, 5); 
    showLinkedStory();
});

// If the page was opened with ?story=<id>, show and highlight that story
function showLinkedStory() {
    const storyId = new URLSearchParams(window, location.search).get('story');
    if (!storyId) return;

    const story = allStories.find(s => String(s.id) === storyId);
    if (!story) return;

    //Show only that story's temple, with all of its stories, so the linked one is on
    document.getElementById('temple-filter').value = story.templeId;
    displayStories(allStories.filter(s => s.templeId === story.templeId), allTemples, Infinity);

    const card = document.getElementById(`story-${story.id}`);
    if (card) {
        card.classList.add('highlighted');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

async function fetchJson(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url} returned ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        return [];
    }
}

function getMyStories() {
    try {
        return JSON.parse(localStorage.getItem(MY_STORIES_KEY)) || [];
    } catch {
        return [];
    }
}

function saveMyStory(story) {
    const myStories = getMyStories();
    myStories.push(story);
    localStorage.setItem(MY_STORIES_KEY, JSON.stringify(myStories));
}

function setupFilters() {
    const templeFilter = document.getElementById('temple-filter');
    const storyTempleSelect = document.getElementById('story-temple');

    allTemples.forEach(temple => {
        if (temple.status === 'visited') {
            const option = new Option(temple.name, temple.id);
            templeFilter.add(option.cloneNode(true));
            storyTempleSelect.add(option);
        }
    });

    templeFilter.addEventListener('change', (e) => {
        const templeId = e.target.value;
        const filtered = templeId === 'all'
            ? allStories
            : allStories.filter(s => s.templeId == templeId);
        displayStories(filtered, allTemples, 5);
    });
}

// Optimized story display with lazy loading
function displayStories(stories, temples, initialLimit = 5) {
    const container = document.getElementById('stories-list');
    if (!container) return;

    // Group and sort stories
    const grouped = stories.reduce((acc, story) => {
        const temple = temples.find(t => t.id === story.templeId);
        if (!temple) return acc;

        acc[temple.name] = acc[temple.name] || [];
        acc[temple.name].push(story);
        return acc;
    }, {});

    const sortedTempleNames = Object.keys(grouped).sort();

    // Build HTML
    let html = '';
    sortedTempleNames.forEach(templeName => {
        html += `<section class="temple-stories">
                   <h2>${templeName}</h2>
                   <div class="story-cards">`;

        grouped[templeName].slice(0, initialLimit).forEach(story => {
            html += renderStoryCard(story);
        });

        // Add "Load More" if needed
        if (grouped[templeName].length > initialLimit) {
            html += `<button class="load-more" 
                            data-temple="${templeName}" 
                            data-offset="${initialLimit}"
                            aria-label="Load more stories">
                        Load More
                    </button>`;
        }

        html += `</div></section>`;
    });

    container.innerHTML = html || '<p>No stories found. Be the first to share!</p>';

    // Set up "Load More" handlers
    document.querySelectorAll('.load-more').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const templeName = e.target.dataset.temple;
            const offset = parseInt(e.target.dataset.offset);
            const additionalStories = grouped[templeName].slice(offset, offset + 3); // Load 3 more

            additionalStories.forEach(story => {
                e.target.insertAdjacentHTML('beforebegin', renderStoryCard(story));
            });

            // Update button
            if (offset + 3 >= grouped[templeName].length) {
                e.target.remove();
            } else {
                e.target.dataset.offset = offset + 3;
            }
        });
    });
}

// Individual story card renderer
function renderStoryCard(story) {
    return `
        <article class="story-card" id="story-${story.id}">
            ${story.date ? `<div class="story-date">${formatDate(story.date)}</div>` : ''}
            <h3>${story.title}</h3>
            <p>${story.content}</p>
            ${story.image ? `
                <img src="${story.image.replace('.jpg', '-600.webp')}" 
                     srcset="${story.image.replace('.jpg', '-300.webp')} 300w,
                             ${story.image.replace('.jpg', '-600.webp')} 600w"
                     sizes="(max-width: 768px) 100vw, 50vw"
                     width="600"
                     height="400"
                     loading="lazy"
                     alt="${story.title}">
            ` : ''}
        </article>`;
}

// Date formatting helper
function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString + 'T00:00').toLocaleDateString(undefined, options);
}

// Form handling with local draft saving
document.getElementById('story-form')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!this.checkValidity()) {
        this.reportValidity();
        return;
    }

    const newStory = {
        id: 'story-' + Date.now(),
        templeId: parseInt(this.elements['story-temple'].value),
        date: this.elements['story-date'].value || null,
        title: this.elements['story-title'].value,
        content: this.elements['story-content'].value
    };

    try {
        saveMyStory(newStory);
        allStories.push(newStory);
        displayStories(allStories, allTemples, 5);

        this.reset();
        localStorage.removeItem('storyDraft');
        alert('Story submitted successfully!');
    } catch (error) {
        console.error('Error saving story:', error);
        alert('Error saving story. Please try again.');
    }
});

// Draft saving
document.getElementById('story-form')?.addEventListener('input', function () {
    const draft = {
        title: this.elements['story-title'].value,
        content: this.elements['story-content'].value,
        templeId: this.elements['story-temple'].value
    };
    localStorage.setItem('storyDraft', JSON.stringify(draft));
});

// Load draft on page load
function loadDraft() {
    const draft = JSON.parse(localStorage.getItem('storyDraft'));
    if (draft && document.getElementById('story-form')) {
        document.getElementById('story-title').value = draft.title;
        document.getElementById('story-content').value = draft.content;
        document.getElementById('story-temple').value = draft.templeId;
    }
}

// Initialize draft loading
document.addEventListener('DOMContentLoaded', loadDraft);