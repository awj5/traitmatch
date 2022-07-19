'use strict';

/* Global vars */

window.leaderboardsLoadDate;

/* On DOM load */

document.addEventListener('DOMContentLoaded', () => {
    // Mouse events
    document.querySelector('select#leaderboards-collections').addEventListener('change', () => {
        loadLeaderboard();
    });

    document.querySelector('select#leaderboards-range').addEventListener('change', () => {
        loadLeaderboard();
    });
});

/* Leaderboards */

async function leaderboards() {
    const collections = document.querySelector('select#leaderboards-collections');

    // Set collections dropdown (once only)
    if (!collections.querySelectorAll('option').length) {
        const collectionsData = await getSupportedCollections();

        for (let x = 0; x < collectionsData.length; x++) {
            if (collectionsData[x].featured) {
                let option = document.createElement('option');
                option.text = collectionsData[x].name;
                option.value = collectionsData[x].slug;
                document.querySelector('select#leaderboards-collections').add(option);
            }
        }
    }

    // Pre-select collection if currently playing
    if (window.collection && collections.querySelector(`option[value=${ window.collection }]`)) {
        collections.value = window.collection;
    }

    loadLeaderboard(); // Init
}

async function loadLeaderboard() {
    const date = Date.now();
    window.leaderboardsLoadDate = date;
    const list = document.querySelector('#leaderboards-collection-list');
    list.innerHTML = ''; // Clear
    const collections = document.querySelector('select#leaderboards-collections');
    const range = document.querySelector('select#leaderboards-range').value;
    const slug = collections.value;
    const collection = await getOSCollection(slug); // Get thumbnail
    const scores = await getData(`${ window.apiURL }scores/${ slug }/${ range }`);
    const walletAddress = await getWalletAddress();

    if (window.leaderboardsLoadDate === date) {
        // Heading
        const name = collections.selectedOptions[0].text;
        const heading = document.querySelector('#leaderboards-collection h3');
        const image = heading.querySelector('img');

        if (name !== heading.textContent) {
            image.src = collection.image_url;
            image.alt = name;
            heading.querySelector('span').textContent = name;
        }

        // High score
        if (walletAddress) {
            const highScore = document.querySelector('p#leaderboards-collection-hs');
            const highScoreData = await getData(`${ window.apiURL }score/${ slug }/${ walletAddress }/${ range }`);

            if (highScoreData.length) {
                // Show
                highScore.querySelector('span').textContent = highScoreData[0].score;
                highScore.style.display = 'block';
            } else {
                // Hide
                highScore.style.display = '';
            }
        }

        // Top scores
        for (let x = 0; x < scores.length; x++) {
            setTimeout(() => {
                if (window.leaderboardsLoadDate === date) {
                    let row = document.createElement('p');
                    let wallet = scores[x].wallet;
                    let thumb = scores[x].token ? `https://traitmatch.s3.us-west-1.amazonaws.com/${ slug }/${ scores[x].token }.png` : '/assets/img/placeholder.png';
                    let address = walletAddress && walletAddress === wallet ? '<span class="leaderboards-list-you">You</span>' : `${ wallet.substring(0, 5) }...${ wallet.substring(wallet.length -  4) }`;
                    row.innerHTML = `<span class="leaderboards-list-number">${ x + 1 }.</span><img src="${ thumb }" alt="" />${ address }<span class="leaderboards-list-score">${ scores[x].score }</span>`; // Minimised address
                    row.classList.add('fade-in-1-025');
                    list.appendChild(row);
                }
            }, x * 100);
        }
    }
}