const GEMINI_API_KEY = "AIzaSyAWpFx04-d4hrNyWEPQ27ORO8KL-fGeQRI";
const Unplash_API_KEY = "AwPmddcdf_Pc4-EA4TGQzPzHUCv9txbldZV1BOUG4v4";

const locationButt = document.querySelector(".getLocation");
const inputField = document.querySelector("#place");
const imageGrid = document.querySelector(".image-grid");
const touristInfoContainer = document.querySelector('.tourist-info');

async function fetchGeminiInfo(location) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Create a detailed travel guide for ${location} with exactly these 4 sections:

1. Must-Visit Attractions
- List exactly 3 major attractions
- Include a brief description for each

2. Best Time to Visit
- Mention the ideal season
- Include weather information
- Specify peak and off-peak times

3. Local Cuisine Highlights
- List 3 must-try local dishes
- Include any famous restaurants or food streets

4. Cultural Tips
- List 2-3 important customs or etiquette tips
- Include any dress code recommendations

Format each section clearly with headings and bullet points.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const content = data.candidates[0].content.parts[0].text;
        
        console.log('Raw API response:', content);
        
        return formatTouristInfo(content, location);

    } catch (error) {
        console.error('Error fetching from Gemini:', error);
        return `
            <div class="tourist-info-content">
                <h2>Travel Guide: ${location}</h2>
                <div class="tourist-section error">
                    <h3><i class="fas fa-exclamation-circle"></i> Information Temporarily Unavailable</h3>
                    <p>We're having trouble fetching information about ${location} at the moment. Please try again later.</p>
                </div>
            </div>
        `;
    }
}

function formatTouristInfo(content, location) {
    content = content.replace(/\*\*/g, '');

    const sections = {
        attractions: extractSection(content, "Must-Visit Attractions", "Best Time to Visit"),
        timing: extractSection(content, "Best Time to Visit", "Local Cuisine Highlights"),
        cuisine: extractSection(content, "Local Cuisine Highlights", "Cultural Tips"),
        culture: extractSection(content, "Cultural Tips", null)
    };

    return `
        <div class="tourist-info-content">
            <h2>Travel Guide: ${location}</h2>
            <button class="save-destination-btn" onclick="saveDestination('${location}')">
                <i class="fas fa-heart"></i> Save Destination
            </button>
            
            <div class="tourist-section">
                <h3><i class="fas fa-landmark"></i> Must-Visit Attractions</h3>
                ${formatSectionContent(sections.attractions)}
            </div>

            <div class="tourist-section">
                <h3><i class="fas fa-clock"></i> Best Time to Visit</h3>
                ${formatSectionContent(sections.timing)}
            </div>

            <div class="tourist-section">
                <h3><i class="fas fa-utensils"></i> Local Cuisine</h3>
                ${formatSectionContent(sections.cuisine)}
            </div>

            <div class="tourist-section">
                <h3><i class="fas fa-globe"></i> Cultural Tips</h3>
                ${formatSectionContent(sections.culture)}
            </div>
        </div>
    `;
}

function extractSection(content, startSection, endSection) {
    const startIndex = content.indexOf(startSection);
    let endIndex = endSection ? content.indexOf(endSection) : content.length;
    
    if (startIndex === -1) return null;
    if (endIndex === -1) endIndex = content.length;

    return content.slice(startIndex + startSection.length, endIndex).trim();
}

function formatSectionContent(content) {
    if (!content) return '<p>Information not available</p>';

    const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^\d+\./));

    if (lines.length === 0) return '<p>Information not available</p>';

    const formattedLines = lines.map(line => {
        line = line.replace(/^[-•:]+\s*/, '');
        
        if (line.includes(':')) {
            const [title, description] = line.split(':').map(part => part.trim());
            return `<li><strong>${title}:</strong> ${description}</li>`;
        }
        
        return `<li>${line}</li>`;
    });

    return `<ul class="section-list">${formattedLines.join('')}</ul>`;
}

async function fetchImages(query) {
    const loadingElement = document.querySelector('.loading');
    loadingElement.style.display = 'flex';
    imageGrid.innerHTML = '';

    try {
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${query}&per_page=8&client_id=${Unplash_API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        loadingElement.style.display = 'none';

        if (data.results && data.results.length > 0) {
            imageGrid.innerHTML = '';
            let count = 0;
            data.results.forEach(photo => {
                count++;
                if(count >= 5) return;
                const card = document.createElement('div');
                card.className = 'image-card';
                card.innerHTML = `
                    <img src="${photo.urls.regular}" alt="${photo.alt_description || 'Travel destination'}">
                    <div class="image-info">
                        <div class="photo-credit">
                            Photo by <a href="${photo.user.links.html}" target="_blank">${photo.user.name}</a> on 
                            <a href="https://unsplash.com" target="_blank">Unsplash</a>
                        </div>
                    </div>
                `;
                imageGrid.appendChild(card);
            });
        } else {
            imageGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-image"></i>
                    <p>No images found for this location.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error details:', error);
        loadingElement.style.display = 'none';
        imageGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading images. Please try again.</p>
            </div>
        `;
    }
}

async function updateTouristInfo(location) {
    try {
        touristInfoContainer.innerHTML = `
            <div class="info-loading active">
                <div class="spinner"></div>
                <span>Loading destination information...</span>
            </div>
        `;

        const touristInfo = await fetchGeminiInfo(location);
        
        if (touristInfo) {
            touristInfoContainer.innerHTML = touristInfo;
        } else {
            throw new Error('No tourist information received');
        }
    } catch (error) {
        console.error('Error updating tourist info:', error);
        touristInfoContainer.innerHTML = `
            <div class="tourist-info-content">
                <h2>Travel Guide: ${location}</h2>
                <div class="tourist-section error">
                    <h3><i class="fas fa-exclamation-circle"></i> Error</h3>
                    <p>Unable to load travel information. Please try again later.</p>
                </div>
            </div>
        `;
    }
}

// Save Destination Functions
function saveDestination(destination) {
    let savedDestinations = JSON.parse(localStorage.getItem('savedDestinations')) || [];
    
    if (!savedDestinations.includes(destination)) {
        savedDestinations.push(destination);
        localStorage.setItem('savedDestinations', JSON.stringify(savedDestinations));
        updateSavedDestinationsList();
        alert('Destination saved!');
    } else {
        alert('This destination is already saved!');
    }
}

function removeDestination(destination) {
    let savedDestinations = JSON.parse(localStorage.getItem('savedDestinations')) || [];
    savedDestinations = savedDestinations.filter(dest => dest !== destination);
    localStorage.setItem('savedDestinations', JSON.stringify(savedDestinations));
    updateSavedDestinationsList();
}

function updateSavedDestinationsList() {
    const savedList = document.getElementById('savedList');
    const savedDestinations = JSON.parse(localStorage.getItem('savedDestinations')) || [];
    
    savedList.innerHTML = '';
    
    if (savedDestinations.length === 0) {
        savedList.innerHTML = '<p>No saved destinations yet.</p>';
        return;
    }

    savedDestinations.forEach(destination => {
        const card = document.createElement('div');
        card.className = 'saved-destination-card';
        card.innerHTML = `
            <span>${destination}</span>
            <div class="card-actions">
                <button class="view-destination-btn" onclick="loadDestination('${destination}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="remove-destination-btn" onclick="removeDestination('${destination}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        savedList.appendChild(card);
    });
}

function loadDestination(destination) {
    inputField.value = destination;
    fetchImages(`${destination} landmarks`);
    updateTouristInfo(destination);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Event Listeners
locationButt.addEventListener("click", () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                .then(response => response.json())
                .then(data => {
                    let address = "";
                    if (data.address.city) address = data.address.city;
                    else if (data.address.county) address = data.address.county;
                    if (data.address.state) address += `, ${data.address.state}`;
                    if (data.address.country) address += `, ${data.address.country}`;

                    if (address) {
                        inputField.value = address;
                        fetchImages(`${address} landmarks`);
                        updateTouristInfo(address);
                    } else {
                        throw new Error("Location not found");
                    }
                })
                .catch(err => {
                    console.error("Error fetching location:", err);
                    alert("Unable to detect location. Please enter manually.");
                });
        });
    } else {
        alert("Geolocation is not supported by your browser");
    }
});

document.getElementById("searchButton").addEventListener("click", (e) => {
    e.preventDefault();
    const searchQuery = inputField.value.trim();
    
    if (searchQuery) {
        fetchImages(`${searchQuery} landmarks`);
        updateTouristInfo(searchQuery);
    } else {
        alert("Please enter a location!");
    }
});

// Initialize saved destinations list when page loads
document.addEventListener('DOMContentLoaded', () => {
    updateSavedDestinationsList();
});