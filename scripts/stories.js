// Cache for API responses
const DATA_CACHE_KEY = 'temple-stories-data';

// Debounce timer for filtering
let filterDebounce;

document.addEventListener('DOMContentLoaded', async function () {
    // Load data with caching
    const [temples, stories] = await Promise.all([
        fetchWithCache('data/temples.json'),
        fetchWithCache('data/stories.json')
    ]);

    // Initialize page
    setupFilters(temples);
    displayStories(stories, temples, 5); // Only show 5 stories initially
});

// Cache-first data fetching
async function fetchWithCache(url) {
    try {
        // Check cache
        const cached = localStorage.getItem(`${DATA_CACHE_KEY}-${url}`);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            // Use cache if < 1 hour old
            if (Date.now() - timestamp < 3600000) return data;
        }

        // Fetch fresh data
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();

        // Update cache
        localStorage.setItem(`${DATA_CACHE_KEY}-${url}`, JSON.stringify({
            data,
            timestamp: Date.now()
        }));

        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        return [];
    }
}

// Filter setup with debouncing
function setupFilters(temples) {
    const templeFilter = document.getElementById('temple-filter');
    const storyTempleSelect = document.getElementById('story-temple');

    temples.forEach(temple => {
        if (temple.status === 'visited') {
            const option = new Option(temple.name, temple.id);
            templeFilter.add(option.cloneNode(true));
            storyTempleSelect.add(option);
        }
    });

    templeFilter.addEventListener('change', (e) => {
        clearTimeout(filterDebounce);
        filterDebounce = setTimeout(() => {
            const templeId = e.target.value;
            const stories = JSON.parse(localStorage.getItem(`${DATA_CACHE_KEY}-data/stories.json`))?.data || [];
            const filtered = templeId === 'all'
                ? stories
                : stories.filter(s => s.templeId == templeId);
            displayStories(filtered, temples, 5);
        }, 300);
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
        <article class="story-card">
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
    return new Date(dateString).toLocaleDateString(undefined, options);
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
        content: this.elements['story-content'].value,
        image: '' // Placeholder for image uploads
    };

    try {
        // Update cached stories
        const cacheKey = `${DATA_CACHE_KEY}-data/stories.json`;
        const cached = JSON.parse(localStorage.getItem(cacheKey)) || { data: [] };
        cached.data.push(newStory);
        localStorage.setItem(cacheKey, JSON.stringify(cached));

        // Refresh display
        const temples = await fetchWithCache('data/temples.json');
        displayStories(cached.data, temples, 5);

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