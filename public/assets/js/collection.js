'use strict';

/* Global vars */

window.collection;
window.contract;
window.collectionTotalCount;
window.collectionTraits = [];
window.shuffleDate;
window.items = [];
window.gameItemCount = 100;
window.boardItems = [];
window.selectedItem;
window.deselectedItem;
window.streak = false;
window.scoreTotal;
window.scoreMatches;
window.scoreRarity;
window.scoreStreak;
window.collectionTokens = [];

/* On DOM load */

document.addEventListener('DOMContentLoaded', () => {
    // Trait hints toggle
    const traitHints = document.querySelector('input#controls-trait-hints');

    if (localStorage.tmTraitHints && localStorage.tmTraitHints === 'false') {
        traitHints.checked = false;
    }

    traitHints.addEventListener('change', (e) => {
        if (e.currentTarget.checked) {
            localStorage.tmTraitHints = 'true';
            e.currentTarget.checked = true;
        } else {
            localStorage.tmTraitHints = 'false';
            e.currentTarget.checked = false;
        }
    });

    // Traits hover
    const hover = document.querySelector('#traits-hover');

    window.addEventListener('mousemove', (e) => {
        if (!window.touchScreen && window.innerWidth > 960) {
            hover.style.left = e.clientX + 12 + 'px';

            // Above or below cursor
            if (e.clientY >= window.innerHeight / 2) {
                hover.style.bottom = window.innerHeight - e.clientY + 'px';
                hover.style.top = 'auto';
            } else {
                hover.style.top = e.clientY + 12 + 'px';
                hover.style.bottom = '';
            }
        }
    });

    // Incase hover gets stuck on mobile
    hover.addEventListener('click', (e) => {
        hideTraitHintsHover();
    });

    const items = document.querySelectorAll('#game-board a');
    var delay;
    var traitOverlay;

    for (let x = 0; x < items.length; x++) {
        let item = items[x];
        let num = x + 1;

        // Hover
        item.addEventListener('mouseover', () => {
            if (!window.touchScreen && window.innerWidth > 960) {
                showTraitHintsHover(item.getAttribute('data-item'), num);
            }
        });

        item.addEventListener('mouseout', () => {
            if (!window.touchScreen && window.innerWidth > 960) {
                hideTraitHintsHover();
            }
        });

        // Click/touch
        item.addEventListener('touchstart', () => {
            delay = setTimeout(() => {
                showTraitHintsHover(item.getAttribute('data-item'), num);
                traitOverlay = true;
            }, 500);
        });

        item.addEventListener('touchend', () => {
            hideTraitHintsHover();

            setTimeout(() => {
                traitOverlay = false;
            }, 100); // Avoid clash with mouseup

            clearTimeout(delay);
        });

        item.addEventListener('mouseup', () => {
            if (!traitOverlay) {
                selectItem(num);
            }
        });
    }
});

/* Collection */

async function loadCollection() {
    if (window.collection !== window.pattern) {
        window.collection = window.pattern;
        const collectionData = await getOSCollection(window.collection);

        if (window.collection === window.pattern) {
            window.contract = collectionData.primary_asset_contracts[0].address;
            window.collectionTotalCount = collectionData.stats.count; // Total items
            window.collectionTraits = collectionData.traits;
            setItems(window.collection);
            window.scoreTotal = localStorage['tmScoreTotal' + window.collection] ? localStorage['tmScoreTotal' + window.collection] : 0;
            window.scoreMatches = localStorage['tmScoreMatches' + window.collection] ? localStorage['tmScoreMatches' + window.collection] : 0;
            window.scoreRarity = localStorage['tmScoreRarity' + window.collection] ? localStorage['tmScoreRarity' + window.collection] : 0;
            window.scoreStreak = localStorage['tmScoreStreak' + window.collection] ? localStorage['tmScoreStreak' + window.collection] : 0;
            var nfts = [];

            // Get user collection owned NFTs
            try {
                const tokens = await getData(`/api/nfts/${ await getWalletAddress() }/${ window.contract }`);
                nfts = tokens.ownedNfts;
            } catch (error) {
                console.error(error);
            }

            if (window.collection === window.pattern) {
                window.collectionTokens = []; // Reset

                for (let x = 0; x < nfts.length; x++) {
                    window.collectionTokens.push(nfts[x].metadata.name.split('#').pop());
                }

                shuffle(); // Init
            }
        }
    } else {
        // Collection hasn't changed
        document.querySelector('#collection-game').style.visibility = 'visible';
    }
}

function setItems(slug) {
    if (localStorage['tmItems' + slug]) {
        // Already set
        window.items = JSON.parse(localStorage['tmItems' + slug]);
    } else {
        window.items = []; // Clear

        // Set new selection of items
        var loopCount = 0;

        while (loopCount < window.gameItemCount) {
            let randItem = Math.floor(Math.random() * window.collectionTotalCount);

            if (!window.items.includes(randItem)) {
                window.items.push(randItem); // Add to selection
                loopCount++;
            }
        }

        localStorage['tmItems' + slug] = JSON.stringify(window.items); // Save to local storage
    }
}

async function shuffle(manual) {
    const game = document.querySelector('#collection-game');

    if (!manual || manual && game.style.visibility === 'visible') {
        const date = Date.now()
        window.shuffleDate = date;
        window.boardItems = []; // Clear
        window.selectedItem = 0;
        window.deselectedItem = 0;
        window.streak = false;
        document.querySelector('#game-controls').classList.remove('enabled'); // Disable controls

        // Update scores and counter
        document.querySelector('h3#game-streak span.game-score').textContent = window.scoreStreak;
        document.querySelector('h3#game-total span.game-score').textContent = window.scoreTotal;
        document.querySelector('h3#game-matches span.game-score').textContent = window.scoreMatches;
        document.querySelector('h3#game-rarity span.game-score').textContent = window.scoreRarity;
        updateCounter();

        if (window.scoreStreak) {
            streakBroken();
        }

        // Reset all board items
        const items = document.querySelectorAll('#game-board a');

        for (let x = 0; x < items.length; x++) {
            if (date === window.shuffleDate) {
                await resetItem(x + 1);
            }
        }

        if (date === window.shuffleDate) {
            game.style.visibility = 'visible'; // Show
            setItem(1, date, true); // Set first item
        }

        // Instructions
        if (!localStorage['tmOB1']) {
            toggleOverlay('Welcome', 'Hello fren 👋, it looks like you\'re new here. Get started by selecting any NFT from the board.');
            localStorage['tmOB1'] = true;
        }
    }
}

async function resetItem(num) {
    const item = document.querySelector('a#board-item-' + num);
    item.removeAttribute('data-item');
    item.style.pointerEvents = '';
    item.setAttribute('class', '');
    item.querySelector('p').classList.remove('fade-in-1-015');
    const image = item.querySelector('img');
    image.setAttribute('class', '');
    image.setAttribute('src', '/assets/img/placeholder.png');
    image.style.transform = '';
    await image.decode();
}

function setItem(num, date, shuffle, swapped) {
    // Check if there is enough items left to add to board
    if (date === window.shuffleDate && window.boardItems.length < window.items.length) {
        const rand = window.items[Math.floor(Math.random() * window.items.length)]; // Random item from array

        if (!window.boardItems.includes(rand)) {
            window.boardItems.push(rand); // Add to board
            loadItem(num, rand, date, swapped);

            // Next item
            if (shuffle && num < 20) {
                setItem(num + 1, date, true);
            }
        } else {
            // Try again
            setItem(num, date, shuffle);
        }
    }
}

async function loadItem(num, item, date, swapped) {
    const asset = await getData(`/api/nft/${ window.contract }/${ item }`);
    //console.log(asset);

    if (asset && asset.metadata && date === window.shuffleDate) {
        const boardItem = document.querySelector('a#board-item-' + num);
        boardItem.setAttribute('data-item', item);
        const image = boardItem.querySelector('img');
        image.setAttribute('src', `https://traitmatch.s3.us-west-1.amazonaws.com/dourdarcels/${ item }.png`); // Update image
        const traits = asset.metadata.attributes;
        window[`item${ num }Traits`] = traits; // Set item traits

        // Detect wildcard (<= 0.1%)
        for (let x = 0; x < traits.length; x++) {
            let trait = traits[x];
            let rarityPercentage = window.collectionTraits[trait.trait_type][trait.value.toLowerCase()] / window.collectionTotalCount * 100;

            if (rarityPercentage <= 0.1 && !boardItem.classList.contains('wildcard')) {
                boardItem.classList.add('wildcard');
            }
        }

        // Detect if user owns item and make wildcard
        if (window.collectionTokens.includes(item.toString()) && !boardItem.classList.contains('wildcard')) {
            boardItem.classList.add('wildcard');
        }

        function detectWildcards() {
            const wildcards = document.querySelectorAll('a.wildcard');
            return wildcards.length !== 0 ? true : false;
        }

        // Instructions
        if (localStorage['tmOB3'] && !localStorage['tmOB4'] && document.querySelector('#overlay').style.display !== 'flex' && detectWildcards()) {
            toggleOverlay('Wildcard Detected!', 'NFTs you own and also ones with rare 1/1 traits are wildcards that can be matched with any item to receive a special bonus. Wildcards have a <span style="color: #FFFF00;">yellow</span> border when selected.');
            localStorage['tmOB4'] = true;
        }

        if (num === 20 || num === window.items.length) {
            document.querySelector('#game-controls').classList.add('enabled');
        }

        image.onload = () => {
            if (date === window.shuffleDate) {
                image.classList.add('scale-up-1-025'); // Scale in
            }

            image.onload = null;
        }

        boardItem.style.pointerEvents = 'auto'; // Enable
    } else if (date === window.shuffleDate && !swapped) {
        // API error - Try swapping token only once
        setTimeout(() => {
            swapItem(num, item, date);
        }, 1000); // Take a beat after an API error
    }
}

function swapItem(num, item, date) {
    if (date === window.shuffleDate) {
        const randItem = Math.floor(Math.random() * window.collectionTotalCount); // New random item

        if (!window.items.includes(randItem)) {
            const index = window.items.indexOf(item);
            window.items.splice(index, 1); // Remove old
            window.items.push(randItem); // Add new
            setItem(num, date, false, true);
        } else {
            // Try again
            swapItem(num, item, date);
        }
    }
}

function restart(confirm) {
    if (!confirm || document.querySelector('#collection-game').style.visibility === 'visible' && window.confirm('Are you sure you want to restart your game?')) {
        localStorage.removeItem('tmItems' + window.pattern);
        window.scoreTotal = 0;
        window.scoreMatches = 0;
        window.scoreRarity = 0;
        window.scoreStreak = 0;
        localStorage['tmScoreTotal' + window.pattern] = window.scoreTotal;
        localStorage['tmScoreMatches' + window.pattern] = window.scoreMatches;
        localStorage['tmScoreRarity' + window.pattern] = window.scoreRarity;
        localStorage['tmScoreStreak' + window.pattern] = window.scoreStreak;
        setItems(window.pattern); // Get new selection
        shuffle(true);
    }
}

function selectItem(num) {
    if (document.querySelector('#collection-game').style.visibility === 'visible') {
        // Prev selected item
        if (window.selectedItem && window.selectedItem !== num) {
            matchTraits(num);
        } else if (window.deselectedItem && window.deselectedItem !== num) {
            streakBroken();
        }

        window.deselectedItem = 0; // Reset

        if (window.selectedItem === num) {
            // Deselect
            document.querySelector('a#board-item-' + num).classList.remove('selected');
            window.selectedItem = 0;
            window.deselectedItem = num;
        } else {
            // Select
            document.querySelector('a#board-item-' + num).classList.add('selected');
            window.selectedItem = num;
        }

        // Instructions
        if (!localStorage['tmOB2']) {
            toggleOverlay('Nice!', `Now select another NFT that has one or more matching traits.<br /><br />The more traits you match the higher your score and you'll get a bonus for matching rare traits 💎<br /><br /><span style="color: #87CEEB;">Tip:</span> ${ window.touchScreen ? 'Long press an NFT to zoom in and see a list of traits (trait hints can be disabled).' : 'Trait hints can be disabled if you\'re up for more of a challenge.' }`);
            localStorage['tmOB2'] = true;
        }
    }
}

function matchTraits(num) {
    const date = window.shuffleDate;
    const selectedTraits = window[`item${ num }Traits`];
    const prevItem = document.querySelector('a#board-item-' + window.selectedItem);
    const prevTraits = window[`item${ window.selectedItem }Traits`];
    var matchesFound = 0;
    var rarityBonus = 0;

    // Loop all traits in prev selected
    for (let x = 0; x < prevTraits.length; x++) {
        let prevTrait = prevTraits[x];

        // Point and bonus for all traits (less than 50%) if wildcard
        if ((prevItem.classList.contains('wildcard') || document.querySelector('a#board-item-' + num).classList.contains('wildcard')) && window.collectionTraits[prevTrait.trait_type][prevTrait.value.toLowerCase()] < window.collectionTotalCount / 2) {
            matchesFound++;
            rarityBonus++;
        } else {
            // Loop all traits in currently selected
            for (let x = 0; x < selectedTraits.length; x++) {
                let selectedTrait = selectedTraits[x];
                let selectedTraitCount = window.collectionTraits[selectedTrait.trait_type][selectedTrait.value.toLowerCase()];

                // Only match traits that are less than 50%
                if (selectedTrait.trait_type === prevTrait.trait_type && selectedTrait.value === prevTrait.value && selectedTraitCount < window.collectionTotalCount / 2) {
                    // Match found
                    matchesFound++;
                    rarityBonus += getRarityBonus(selectedTraitCount);
                }
            }
        }
    }

    if (matchesFound) {
        showMatchResult(date, window.selectedItem, prevItem, matchesFound, rarityBonus);
    } else {
        streakBroken();
    }

    prevItem.classList.remove('selected'); // Reset
}

function getRarityBonus(traitCount) {
    var bonus = 0;
    let rarityPercentage = traitCount / window.collectionTotalCount * 100;

    // Rarity bonus only given to traits less than 2.5%
    if (rarityPercentage <= 0.25) {
        bonus = 10;
    } else if (rarityPercentage <= 0.5) {
        bonus = 9;
    } else if (rarityPercentage <= 0.75) {
        bonus = 8;
    } else if (rarityPercentage <= 1) {
        bonus = 7;
    } else if (rarityPercentage <= 1.25) {
        bonus = 6;
    } else if (rarityPercentage <= 1.5) {
        bonus = 5;
    } else if (rarityPercentage <= 1.75) {
        bonus = 4;
    } else if (rarityPercentage <= 2) {
        bonus = 3;
    } else if (rarityPercentage <= 2.25) {
        bonus = 2;
    } else if (rarityPercentage <= 2.5) {
        bonus = 1;
    }

    return bonus;
}

function showMatchResult(date, prevSelectedItem, prevItem, matchesFound, rarityBonus) {
    // Remove item from arrays
    const item = parseInt(prevItem.getAttribute('data-item'));
    var index = window.items.indexOf(item);
    window.items.splice(index, 1); // Remove
    index = window.boardItems.indexOf(item);
    window.boardItems.splice(index, 1); // Remove
    localStorage['tmItems' + window.pattern] = JSON.stringify(window.items); // Update local storage
    updateCounter();

    const results = prevItem.querySelector('p');
    results.innerHTML = `<span class="results-matches"><svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24" class="svg-star"><g><path d="M0,0h24v24H0V0z" fill="none"/><path d="M0,0h24v24H0V0z" fill="none"/></g><g><path d="M12,17.27L18.18,21l-1.64-7.03L22,9.24l-7.19-0.61L12,2L9.19,8.63L2,9.24l5.46,4.73L5.82,21L12,17.27z"/></g></svg>${ matchesFound }${ window.innerWidth > 960 ? matchesFound === 1 ? ' match' : ' matches' : '' }</span>`;

    if (rarityBonus) {
        results.innerHTML += `<span class="results-rarity"><svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24" class="svg-diamond"><g><rect fill="none" height="24" width="24"/></g><g><path d="M19,3H5L2,9l10,12L22,9L19,3z M9.62,8l1.5-3h1.76l1.5,3H9.62z M11,10v6.68L5.44,10H11z M13,10h5.56L13,16.68V10z M19.26,8 h-2.65l-1.5-3h2.65L19.26,8z M6.24,5h2.65l-1.5,3H4.74L6.24,5z"/></g></svg>${ rarityBonus }${ window.innerWidth > 960 ? ' bonus' : '' }</span>`;

        // Set bonus
        for (let x = 0; x < rarityBonus; x++) {
            animateScoreIcon('Rarity', results, date);
        }
    }

    if (window.streak) {
        results.innerHTML += `<span class="results-streak"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-heart"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>1${ window.innerWidth > 960 ? ' bonus' : '' }</span>`;
        animateScoreIcon('Streak', results, date); // Set bonus
    }

    // Set matches score
    for (let x = 0; x < matchesFound; x++) {
        animateScoreIcon('Matches', results, date);
    }

    prevItem.style.pointerEvents = '';
    results.classList.add('fade-in-1-015'); // Show results
    window.streak = true;

    // Remove prev
    setTimeout(async () => {
        if (date === window.shuffleDate) {
            await resetItem(prevSelectedItem);
            setItem(prevSelectedItem, date, false);

            // Check if game over
            if (!window.items.length) {
                toggleOverlay('WAGMI!', `Woo hoo! You cleared the board 🎉 Well done fren.<br /><br />You scored <span style="color: #87CEEB;">${ localStorage['tmScoreTotal' + window.pattern] }</span><br />Your high score is <span style="color: #FFFF00;">${ await getHighScore(localStorage['tmScoreTotal' + window.pattern]) }</span>`);
                recordScore(localStorage['tmScoreTotal' + window.pattern]);
                restart(false);
            } else if (window.items.length === 1) {
                // Clear last item automatically
                const lastItem = document.querySelector(`a[data-item="${ window.boardItems[0] }"]`);
                const lastItemNum = lastItem.getAttribute('id').replace('board-item-', '');
                window.selectedItem = lastItemNum;
                matchTraits(lastItemNum);
            } else if (!localStorage['tmOB3']) {
                // Instructions
                toggleOverlay('Boom 💥', 'You did it! Now clear another and get a streak going. Your goal is to clear the board and get the highest score. LFG!<br /><br /><span style="color: #FF0000;">Beware:</span> You\'ll get a bonus for maintaining a streak but if you shuffle the board or select NFTs with no matching traits your streak bonus will reset to zero.');
                localStorage['tmOB3'] = true;
            } else if (window.boardItems.length < 20 && !checkMatches()) {
                // No more matches possible
                toggleOverlay('Game Over', `No more matches can be made. But don't worry fren, your score has still been recorded. Try to clear the board next time for an extra bonus 💪<br /><br />You scored <span style="color: #87CEEB;">${ localStorage['tmScoreTotal' + window.pattern] }</span><br />Your high score is <span style="color: #FFFF00;">${ await getHighScore(localStorage['tmScoreTotal' + window.pattern]) }</span>`);
                recordScore(localStorage['tmScoreTotal' + window.pattern]);
                restart(false);
            }
        }
    }, 3150);

    async function getHighScore(score) {
        const scores = await getData(`/api/scores/${ window.pattern }/${ await getWalletAddress() }`);

        // Is latest score the highest?
        if (scores.length && scores[0].score > score) {
            score = scores[0].score;
        }

        return score;
    }

    async function recordScore(score) {
        const obj = {
            slug: window.pattern,
            wallet: await getWalletAddress(),
            score: score
        };

        postData('/api/scores', obj); // Insert
    }

    function checkMatches() {
        var matchesFound = false;
        var traits = [];

        itemLoop: for (let x = 0; x < window.boardItems.length; x++) {
            let item = document.querySelector(`a[data-item="${ window.boardItems[x] }"]`);

            // Check if wildcard
            if (item.classList.contains('wildcard')) {
                matchesFound = true;
                break;
            }

            let itemNum = item.getAttribute('id').replace('board-item-', '');
            let itemTraits = window[`item${ itemNum }Traits`];

            for (let x = 0; x < itemTraits.length; x++) {
                let trait = itemTraits[x];
                let traitCount = window.collectionTraits[trait.trait_type][trait.value.toLowerCase()];
                let filter = traits.filter(obj => obj.trait_type === trait.trait_type && obj.value === trait.value);

                if (filter.length === 0) {
                    traits.push(trait);
                } else if (traitCount < window.collectionTotalCount / 2) {
                    matchesFound = true;
                    break itemLoop;
                }
            }
        }

        return matchesFound;
    }
}

function animateScoreIcon(type, results, date) {
    scoreAdd(type);
    type = type.toLowerCase();

    setTimeout(() => {
        if (date === window.shuffleDate) {
            var iconSVG;

            switch (type) {
                case 'rarity':
                    iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24" class="svg-diamond"><g><rect fill="none" height="24" width="24"/></g><g><path d="M19,3H5L2,9l10,12L22,9L19,3z M9.62,8l1.5-3h1.76l1.5,3H9.62z M11,10v6.68L5.44,10H11z M13,10h5.56L13,16.68V10z M19.26,8 h-2.65l-1.5-3h2.65L19.26,8z M6.24,5h2.65l-1.5,3H4.74L6.24,5z"/></g></svg>';
                    break;
                case 'streak':
                    iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-heart"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
                    break;
                default:
                    iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24" class="svg-star"><g><path d="M0,0h24v24H0V0z" fill="none"/><path d="M0,0h24v24H0V0z" fill="none"/></g><g><path d="M12,17.27L18.18,21l-1.64-7.03L22,9.24l-7.19-0.61L12,2L9.19,8.63L2,9.24l5.46,4.73L5.82,21L12,17.27z"/></g></svg>';
            }

            // Start
            const icon = document.createElement('div');
            icon.classList.add('score-icon');
            icon.innerHTML = iconSVG;
            const result = results.querySelector(`span.results-${ type } svg`).getBoundingClientRect();
            const startX = result.left;
            const startY = result.top;
            icon.style.left = startX + 'px';
            icon.style.top = startY + 'px';
            const game = document.querySelector('#collection-game');
            game.appendChild(icon);

            // Animate
            const heading = document.querySelector(`h3#game-${ type } svg`).getBoundingClientRect();
            const endX = heading.left;
            const endY = heading.top;

            setTimeout(() => {
                if (date === window.shuffleDate) {
                    icon.style.left = endX + 'px';
                    icon.style.top = endY + 'px';
                    icon.querySelector('svg').classList.add('animate-score');

                    // Remove
                    setTimeout(() => {
                        game.removeChild(icon);

                        if (date === window.shuffleDate) {
                            updateScore(type);
                        }
                    }, 500);
                } else {
                    game.removeChild(icon);
                }
            }, Math.floor((Math.random() * 900) + 100));
        }
    }, 150); // Wait for result to fade in
}

function updateScore(type) {
    const scoreText = document.querySelector(`h3#game-${ type } span.game-score`);
    var score = parseFloat(scoreText.textContent);
    score++;
    scoreText.textContent = score;

    // Add to grand total
    if (type !== 'total') {
        updateScore('total');
    }
}

function scoreAdd(type) {
    window['score' + type]++;
    localStorage['tmScore' + type + window.pattern] = JSON.stringify(window['score' + type]); // Save to local storage

    // Add to grand total
    if (type !== 'Total') {
        scoreAdd('Total');
    }
}

function streakBroken() {
    if (document.querySelector('#collection-game').style.visibility === 'visible' && !localStorage['tmOB5'] && window.scoreStreak !== 0) {
        // Instructions
        toggleOverlay('Uh-oh!', 'You lost your streak bonus 💔 If you shuffle the board or select NFTs with no matching traits your streak bonus will reset to zero.');
        localStorage['tmOB5'] = true;
    }

    const date = window.shuffleDate;
    const diff = window.scoreStreak;
    const streakScore = document.querySelector('h3#game-streak span.game-score');
    const totalScore = document.querySelector('h3#game-total span.game-score');
    window.scoreTotal = window.scoreTotal - diff;
    window.scoreStreak = 0;
    localStorage['tmScoreTotal'] = JSON.stringify(window.scoreTotal);
    localStorage['tmScoreStreak'] = JSON.stringify(window.scoreStreak);
    window.streak = false;

    // Deduct from score text over loop
    for (let x = 0; x < diff; x++) {
        setTimeout(() => {
            if (date === window.shuffleDate) {
                let streak = parseFloat(streakScore.textContent);
                streak--;
                streakScore.textContent = streak;
                let total = parseFloat(totalScore.textContent);
                total--;
                totalScore.textContent = total;
            }
        }, x * 50);
    }
}

function updateCounter() {
    document.querySelector('span.counter').textContent = `${ window.gameItemCount - window.items.length }/${ window.gameItemCount }`;
}

function showTraitHintsHover(item, num) {
    if (window.touchScreen || !localStorage.tmTraitHints || localStorage.tmTraitHints === 'true') {
        // Get traits
        const traits = window[`item${ num }Traits`];
        var traitsList = '';

        // Get traits
        for (let x = 0; x < traits.length; x++) {
            let trait = traits[x];
            let traitCount = window.collectionTraits[trait.trait_type][trait.value.toLowerCase()];

            // Only traits less than 50% rarity
            if (traitCount < window.collectionTotalCount / 2) {
                let rarityPercentage = traitCount / window.collectionTotalCount * 100;
                traitsList += `<br /><span id="hover-type">${ trait.trait_type }:</span> <span style="${ rarityPercentage <= 2.5 ? 'color: #87CEEB;' : '' }">${ trait.value } (${ rarityPercentage.toFixed(1) }%)</span>`;
            }
        }

        // Set content
        const boardItem = document.querySelector('a#board-item-' + num);
        const hover = document.querySelector('#traits-hover');
        const heading = hover.querySelector('h4');
        heading.textContent = '#' + item;
        heading.style.color = boardItem.classList.contains('wildcard') ? '#FF0' : '';

        // Image
        if (window.touchScreen) {
            hover.querySelector('img').setAttribute('src', boardItem.querySelector('img').getAttribute('src'));
        }

        hover.querySelector('p').innerHTML = !localStorage.tmTraitHints || localStorage.tmTraitHints === 'true' ? traitsList : '';
        hover.classList.add('fade-in-1-015');
        hover.style.display = 'flex'; // Show
    }
}

function hideTraitHintsHover() {
    const hover = document.querySelector('#traits-hover');
    hover.style.display = '';
    hover.setAttribute('class', '');
}