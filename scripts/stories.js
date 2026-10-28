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
    displayStories(allStories, allTemples); 
    showLinkedStory();
});

// If the page was opened with ?story=<id>, show and highlight that story
function showLinkedStory() {
    const storyId = new URLSearchParams(window.location.search).get('story');
    if (!storyId) return;

    const story = allStories.find(s => String(s.id) === storyId);
    if (!story) return;

    //Show only that story's temple, with all of its stories, so the linked one is on the page
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
        displayStories(filtered, allTemples);
    });
}

// Story display: one grid of cards, each labeled with it's temple
const STORIES_PER_PAGE = 9;

function displayStories(stories, temples, limit = STORIES_PER_PAGE) {
    const container = document.getElementById('stories-list');
    if (!container) return;

    // Look up each temple's name by it's id
    const templeNames = new Map(temples.map(t => [t.id, t.name]));

    //Keep stories with a known temple, sorted by temple name
    const sorted = stories
        .filter(story => templeNames.has(story.templeId))
        .sort((a, b) => templeNames.get(a.templeId).localeCompare(templeNames.get(b.templeId)));
    
    if (sorted.length === 0) {
        const message = document.createElement('p');
        message.textContent = 'No stories found.  Be the first to share!';
        container.replaceChildren(message);
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'story-grid';

    const loadMore = document.createElement('button');
    loadMore.type = 'button';
    loadMore.className = 'load-more';
    loadMore.textContent = 'Load more stories';

    container.replaceChildren(grid, loadMore);

    let shown = 0;
    function showNext(count) {
        sorted.slice(shown, shown + count).forEach(story => {
            grid.appendChild(renderStoryCard(story, templeNames.get(story.temppleId)));
        });
        shown += count;
        if (shown >= sorted.length) loadMore.remove();
    }

    loadMore.addEventListener('click', () => showNext(STORIES_PER_PAGE));
    showNext(limit);
}

// Build one story card
function renderStoryCard(story, templeName) {
    const card = document.createElement('article');
    card.className = 'story-card';
    card.id = `story-${story.id}`;

    const title = document.createElement('h2');
    title.textContent = story.title;

    const temple = document.createElement('p');
    temple.className = 'story-temple';
    temple.textContent = templeName;

    card.append(title, temple);

    if (story.date) {
        const date = document.createElement('p');
        date.className = 'story-date';
        date.textContent = formatDate(story.date);
        card.appendChild(date);
    }

    const content = document.createElement('p');
    content.textContent = story.content;
    card.appendChild(content);

    if (story.image) {
        const img = document.createElement('img');
        img.src = story.image.replace('.jpg', '-600.webp');
        img.srcset = `${story.image.replace('.jpg', '-300.webp')} 300w, ${story.image.replace('.jpg', '-600.webp')} 600w`;
        img.sizes = '(max-width: 768px) 100vw, 50vw';
        img.width = 600;
        img.height = 400;
        img.alt = story.title;
        card.appendChild(img);
    }

    return card;
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
        displayStories(allStories, allTemples);

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