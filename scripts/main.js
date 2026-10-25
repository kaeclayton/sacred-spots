document.addEventListener('DOMContentLoaded', async function () {
    // Update copyright and modified date
    updateCopyrightAndModifiedDate();

    try {
        // Load temple data
        const response = await fetch('data/temples.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const temples = await response.json();

        // Initialize based on current page
        if (document.querySelector('.gallery-container')) {
            initGallery(temples);
        }
        if (document.querySelector('body').classList.contains('home-page')) {
            loadHomePageData(temples);
        }

    } catch (error) {
        console.error('Error loading temple data:', error);
        showError('Failed to load temple data. Please try again later.');
    }
});

function initGallery(temples) {
    const container = document.querySelector('.gallery-container');
    if (!container) return;

    document.querySelectorAll('.temple-card').forEach(card => {
        const templeId = parseInt(card.getAttribute('data-id'));
        const temple = temples.find(t => t.id === templeId);
        if (!temple) return;

        // Front face content
        const frontContent = card.innerHTML;

        // Back face content
        const backContent = `
            <div class="temple-card-back">
                <button class="close-btn" aria-label="Close details">&times;</button>
                <h3>${temple.name}</h3>
                <p><strong>Location:</strong> ${temple.location.city}, ${temple.location.state || temple.location.country}</p>
                <p><strong>Dedicated:</strong> ${formatDate(temple.dedication)}</p>
                <p><strong>Size:</strong> ${temple.size}</p>
                <div class="temple-features">
                    <h4>Features:</h4>
                    <ul>${temple.features.map(f => `<li>${f}</li>`).join('')}</ul>
                </div>
            </div>
        `;

        // Create flip structure
        card.innerHTML = `
            <div class="temple-card-inner">
                <div class="temple-card-front">${frontContent}</div>
                ${backContent}
            </div>
        `;

        // Set up image
        const img = card.querySelector('img');
        if (img) {
            img.loading = 'lazy';
            img.src = temple.image;
            img.onerror = () => {
                img.src = temple.imageFallback || 'images/default-temple.jpg';
            };
        }

        // Flip functionality
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-btn')) {
                card.classList.remove('flipped');
                return;
            }
            card.classList.toggle('flipped');
            localStorage.setItem('lastViewedTemple', templeId);
        });

        card.addEventListener('keydown', (e) => {
            if (['Enter', ' '].includes(e.key)) {
                e.preventDefault();
                card.classList.toggle('flipped');
            }
        });

        card.tabIndex = 0;
    });
}

async function loadHomePageData(temples) {
    try {
        const storiesResponse = await fetch('data/stories.json');
        if (!storiesResponse.ok) throw new Error('Failed to load stories');
        const stories = await storiesResponse.json();

        // Update stats
        document.getElementById('visited-count').textContent =
            temples.filter(t => t.status === 'visited').length;
        document.getElementById('stories-count').textContent = stories.length;
        document.getElementById('future-count').textContent =
            temples.filter(t => t.status === 'wish list').length;

        // Featured story
        if (stories.length) {
            const featuredStory = stories.reduce((latest, story) =>
                new Date(story.date || 0) > new Date(latest.date || 0) ? story : latest
            );
            document.getElementById('featured-story-title').textContent = featuredStory.title;
            document.getElementById('featured-story-excerpt').textContent =
                featuredStory.content.substring(0, 150) + '...';
            document.getElementById('featured-story-link').href =
                `stories.html?story=${featuredStory.id}`;
        }

    } catch (error) {
        console.error('Error loading home page data:', error);
        showError('Failed to load some content. Please refresh the page.');
    }
}

function updateCopyrightAndModifiedDate() {
    const yearEl = document.getElementById('current-year');
    const modifiedEl = document.getElementById('lastModified');

    if (yearEl) yearEl.textContent = new Date().getFullYear();
    if (modifiedEl) {
        modifiedEl.textContent = `Last Modified: ${new Date(document.lastModified).toLocaleDateString()}`;
    }
}

function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    document.querySelector('main')?.prepend(errorEl);
}

function formatDate(dateString) {
    if (!dateString || isNaN(new Date(dateString))) return 'Unknown date';
    return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}