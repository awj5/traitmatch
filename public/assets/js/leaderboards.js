'use strict';

/* Global vars */

/* On DOM load */

document.addEventListener('DOMContentLoaded', () => {
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
    loadLeaderboard();
}

function loadLeaderboard() {
    console.log(document.querySelector('select#leaderboards-collections').value);
    console.log(document.querySelector('select#leaderboards-range').value);
}