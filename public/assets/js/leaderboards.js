'use strict';

/* Global vars */

/* On DOM load */

document.addEventListener('DOMContentLoaded', () => {

});

/* Leaderboards */

async function leaderboards() {
    var collections = [];
    const collectionsData = await getSupportedCollections();

    // Only enabled collections
    for (let x = 0; x < collectionsData.length; x++) {
        if (collectionsData[x].enabled || location.hostname === 'localhost') {
            collections.push(collectionsData[x]);
        }
    }

    //document.querySelector('section#section-leaderboards h3').textContent = collections[0].name;

    //console.log(collections[0])
    /* if (window.collection) {
        console.log(window.collection)
        getOSCollection(slug)
    } */
}