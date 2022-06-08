'use strict';

/* Global vars */

window.leaderboardsLoadDate;

/* On DOM load */

document.addEventListener('DOMContentLoaded', () => {
    // Mouse events
    document.querySelector('select#leaderboards-collections').addEventListener('change', (e) => {
        loadLeaderboard();
    });

    document.querySelector('select#leaderboards-range').addEventListener('change', (e) => {
        loadLeaderboard();
    });
});

/* Leaderboards */

async function leaderboards() {
    const collections = document.querySelector('select#leaderboards-collections');
    collections.innerHTML = ''; // Clear
    const collectionsData = await getSupportedCollections();

    // Set collections dropdown
    for (let x = 0; x < collectionsData.length; x++) {
        if (collectionsData[x].leaderboard) {
            let option = document.createElement('option');
            option.text = collectionsData[x].name;
            option.value = collectionsData[x].slug;
            collections.add(option);
        }
    }

    // Pre-select collection if currently playing
    if (window.collection && collections.querySelector(`option[value=${ window.collection }]`)) {
        collections.value = window.collection;
    }

    document.querySelector('select#leaderboards-range').value = 0; // Reset
    loadLeaderboard(); // Init
}

async function loadLeaderboard() {
    const date = Date.now();
    window.leaderboardsLoadDate = date;
    const list = document.querySelector('#leaderboards-list');
    list.innerHTML = ''; // Clear
    const collections = document.querySelector('select#leaderboards-collections');
    const slug = collections.value;
    const collection = await getOSCollection(slug); // Get thumbnail
    const scores = await getData(`/api/scores/${ slug }/${ document.querySelector('select#leaderboards-range').value }`);
    const walletAddress = await getWalletAddress();

    if (window.leaderboardsLoadDate === date) {
        const name = collections.selectedOptions[0].text;
        list.innerHTML = `<h3><img src="${ collection.image_url }" alt="${ name }" />${ name }</h3>`;

        if (walletAddress) {
            // Show user high score
            const highScore = await getData(`/api/score/${ slug }/${ walletAddress }`);

            if (highScore.length) {
                list.innerHTML += `<p id="leaderboards-high-score" class="fade-in-1-025">Your high score:<span>${ highScore[0].score }</span></p>`;
            }
        }

        for (let x = 0; x < scores.length; x++) {
            setTimeout(() => {
                if (window.leaderboardsLoadDate === date) {
                    let row = document.createElement('p');
                    let wallet = scores[x].wallet;
                    let thumb = scores[x].token ? `https://traitmatch.s3.us-west-1.amazonaws.com/${ slug }/${ scores[x].token }.png` : '/assets/img/placeholder.png';
                    let address = walletAddress && walletAddress === wallet ? '<span class="leaderboards-list-you">You</span>' : `${ wallet.substring(0, 5) }...${ wallet.substring(wallet.length -  4) }`;
                    row.innerHTML = `<span>${ x + 1 }.</span><img src="${ thumb }" alt="" />${ address }<span class="leaderboards-list-score">${ scores[x].score }</span>`; // Minimised address
                    row.classList.add('fade-in-1-025');
                    list.appendChild(row);
                }
            }, x * 100);
        }
    }
}