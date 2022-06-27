'use strict';

/* Global vars */

window.touchScreen = false;
window.overlayDate;

/* On DOM load */

document.addEventListener('DOMContentLoaded', () => {
    // Detect mobile
    window.touchScreen = matchMedia('(hover: none)').matches;

    if (window.touchScreen) {
        document.querySelector('body').classList.remove('no-touch');
    }

    setEventsGlobal(); // Mouse and keyboard

    // Scroll
    window.addEventListener('scroll', () => {
        //window.pageYOffset;
    });

    // Resize
    window.addEventListener('resize', () => {

    });

    document.querySelector('html').style.visibility = 'visible'; // Hack to avoid FOUC
    //localStorage.clear(); // Use for testing
    start();
});

/* Mouse and keyboard events */

function setEventsGlobal() {
    // Overlay
    document.querySelector('#overlay-bg').addEventListener('click', (e) => {
        toggleOverlay();
    });
}

/* Start */

async function start() {
    // Dark mode
    if (localStorage.tmDarkMode === 'true' || !localStorage.tmDarkMode && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        toggleDarkMode(); // On
    }

    // Pattern
    let patrn = new Pattern();
    patrn.init();

    // Check if wallet already connected
    const address = await getWalletAddress();

    if (address) {
        // Already connected
        walletConnected(address);
    } else {
        // Enable connect button
        document.querySelector('a#nav-item-connect').classList.add('active');
    }
}

/* Global */

async function getData(path) {
    const data = await fetch(path, {
        method: 'get',
        headers: {Accept: 'application/json'}
    })
    .then((response) => {
        return response.json();
    }).catch((error) => {
        console.log(error);
    });

    return data;
}

async function postData(path, body) {
    const data = await fetch(path, {
        method: 'post',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    })
    .then((response) => {
        return response.status;
    })
    .catch((error) => {
        console.log(error);
    });

    return data;
}

function toggleDarkMode() {
    const root = document.querySelector('html');

    if (root.classList.contains('dark-mode')) {
        root.classList.remove('dark-mode');
        document.querySelector('h1 img').setAttribute('src', 'assets/img/icon.png'); // Icon
        localStorage.tmDarkMode = 'false'; // Remember selection
    } else {
        root.classList.add('dark-mode');
        document.querySelector('h1 img').setAttribute('src', 'assets/img/icon-dark.png'); // Icon
        localStorage.tmDarkMode = 'true'; // Remember selection
    }
}

async function patternChange() {
    var section = window.pattern;
    const isCollection = section !== 'home' && section !== 'how' && section !== 'leaderboards';

    // Mobile nav
    if (document.querySelector('nav').style.left === '0px') {
        toggleNav(); // Close
    }

    loadSection(isCollection ? 'collection' : section);

    if (isCollection) {
        // Collection
        const accountCollections = await getAccountCollections(await getWalletAddress());

        // Verify if account owns an NFT in supported collection
        if (section === window.pattern && accountCollections.includes(window.pattern)) {
            // Has NFT in supported collection
            const collection = await getOSCollection(window.pattern);

            if (section === window.pattern) {
                setCollectionNav(collection);
                loadCollection();
            }
        } else if (section === window.pattern) {
            // Does not have NFT in collection or not a supported collection
            window.location = '/'; // Reload
        }
    } else if (document.querySelector('a#nav-item-collection').classList.contains('supported')) {
        resetCollectionNav();
    }
}

function loadSection(section) {
    // Hide all sections
    const sections = document.querySelectorAll('section');

    for (let x = 0; x < sections.length; x++) {
        sections[x].style.display = '';
    }

    // Reset all nav items
    const navItems = document.querySelectorAll('a.nav-item');

    for (let x = 0; x < navItems.length; x++) {
        navItems[x].classList.remove('selected');
    }

    // Set nav
    if (section !== 'collection' && document.querySelector('a#nav-item-' + section)) {
        document.querySelector('a#nav-item-' + section).classList.add('selected');
    }

    document.querySelector('#collection-game').style.visibility = ''; // Hide game
    document.querySelector('section#section-' + section).style.display = 'flex'; // Show section
}

function toggleNav() {
    const nav = document.querySelector('nav');

    if (!nav.style.left || nav.style.left === '100%') {
        nav.style.left = 0; // Show
    } else {
        nav.style.left = '100%'; // Hide
    }
}

async function getWalletAddress() {
    var address;

    // Check for MetaMask
    if (typeof window.ethereum !== 'undefined') {
        // MetaMask installed
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });

        if (accounts.length) {
            // Connected
            address = accounts[0];
        }
    }

    return address;
}

async function connectWallet() {
    // Check for MetaMask
    if (typeof window.ethereum !== 'undefined') {
        // MetaMask installed
        const connectButton = document.querySelector('a#nav-item-connect');
        connectButton.classList.remove('active'); // Disable

        try {
            var accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        } catch (error) {
            console.error(error);
        }

        if (accounts) {
            // Has account
            walletConnected(accounts[0]);

            // Redirect if referrer is collection
            const referrer = document.referrer;

            if (referrer.indexOf('localhost') || referrer.indexOf('traitmatch.io') || referrer.indexOf('traitmatch.herokuapp')) {
                const index = referrer.lastIndexOf('/');
                const collection = referrer.substring(index + 1);

                if (collection && collection !== 'how' && collection !== 'leaderboards') {
                    history.pushState(null, null, collection); // Redirect
                }
            }
        } else {
            // No accounts
            connectButton.classList.add('active'); // Enable
        }
    } else {
        // MetaMask not installed
        toggleOverlay('Install MetaMask', 'TraitMatch currently only supports Ethereum collections via MetaMask. You can download it <a href="https://metamask.io" target="_blank">here</a>.');
    }
}

async function walletConnected(address) {
    document.querySelector('a#nav-item-connect').textContent = `${ address.substring(0, 5) }...${ address.substring(address.length -  4) }`; // Minimised address
    document.querySelector('a#nav-item-collection').classList.add('connected');
}

async function getAccountCollections(address) {
    var collections = [];

    if (address) {
        try {
            var contracts = await getData('/api/contracts/' + address);
            var nfts = contracts.ownedNfts;
            const supported = await getSupportedCollections();
            var page;

            // Loop Alchemy pages
            for (let x = 0; x < Math.ceil(contracts.totalCount / 100); x++) {
                if (x > 0) {
                    // Not first page
                    contracts = await getData(`/api/contracts/${ address }/${ page }`);
                    nfts = contracts.ownedNfts;
                }

                // Set next page UUID
                if (contracts.pageKey) {
                    page = contracts.pageKey;
                }

                // Verify if owned collection supported
                for (let x = 0; x < nfts.length; x++) {
                    let contract = nfts[x].contract.address;

                    // Loop supported contracts
                    for (let x = 0; x < supported.length; x++) {
                        let slug = supported[x].slug;

                        // Check if collection in account wallet
                        if (!collections.includes(slug) && supported[x].contract === contract && (supported[x].enabled || supported[x].beta && await checkBeta(slug, address))) {
                            // Add slug to array
                            collections.push(slug);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    return collections;
}

async function getOSCollection(slug) {
    const collection = await getData(`/data/${ slug }.json`);
    return collection.collection;
}

async function getSupportedCollections() {
    return await getData('/data/collections.json');
}

async function checkBeta(slug, address) {
    var found = false;
    const betaList = await getData(`/data/beta.json`);

    // Loop beta accounts
    for (let x = 0; x < betaList.length; x++) {
        if (betaList[x].slug === slug && betaList[x].wallet.toLowerCase() === address) {
            found = true;
        }
    }

    return found;
}

/* Header */

function navClick(section) {
    history.pushState(null, null, section);
}

function setCollectionNav(collection) {
    const navCollection = document.querySelector('a#nav-item-collection');
    navCollection.querySelector('span').textContent = collection.name;
    navCollection.querySelector('img').setAttribute('src', collection.image_url);
    navCollection.classList.add('supported');
}

function resetCollectionNav() {
    const navCollection = document.querySelector('a#nav-item-collection');
    navCollection.querySelector('span').textContent = 'Collections';
    navCollection.classList.remove('supported');
}

/* Overlay */

function toggleOverlay(heading, blurb) {
    const overlay = document.querySelector('#overlay');

    if (overlay.style.display === 'flex' && window.getComputedStyle(overlay).opacity === '1') {
        // Hide
        overlay.style.display = '';
        overlay.style.opacity = '';
    } else if (overlay.style.display !== 'flex') {
        // Show
        overlay.style.display = 'flex';

        setTimeout(() => {
            overlay.style.opacity = 1;
        }, 100); // Hack! (wait for display change)

        overlay.querySelector('h2').textContent = heading;
        overlay.querySelector('p').innerHTML = blurb;

        // Body
        const body = overlay.querySelector('#overlay-body');
        body.innerHTML = ''; // Clear
        body.setAttribute('class', ''); // Remove all classes
        window.overlayDate = Date.now();

        // Body
        if (heading === 'Collections') {
            loadOverlayCollections();
        }
    }
}

async function loadOverlayCollections() {
    const date = window.overlayDate;
    const overlayBody = document.querySelector('#overlay-body');
    overlayBody.classList.add('overlay-collections');
    overlayBody.innerHTML = '<div class="loading-icon"></div>'; // Add loader
    const collections = await getSupportedCollections();
    const accountCollections = await getAccountCollections(await getWalletAddress());

    if (date === window.overlayDate) {
        var count = 0;

        for (let x = 0; x < collections.length; x++) {
            let slug = collections[x].slug;

            if (accountCollections.includes(slug)) {
                let collectionLink = document.createElement('a');
                collectionLink.innerHTML = `<img src="" alt="" class="collection-icon" />${ collections[x].name }`;
                collectionLink.classList.add('overlay-collection');
                collectionLink.classList.add('fade-in-1-025');

                if (window.pattern === slug) {
                    // Already selected collection
                    collectionLink.classList.add('selected');
                }

                let collection = await getOSCollection(slug); // Get thumbnail

                if (date === window.overlayDate) {
                    if (!count) {
                        overlayBody.innerHTML = ''; // Remove loader
                    }
                    
                    collectionLink.querySelector('img').setAttribute('src', collection.image_url);
                    collectionLink.classList.add((count + 1) % 2 === 0 ? 'overlay-collection-right' : 'overlay-collection-left'); // Left or right column on DT
                    overlayBody.appendChild(collectionLink); // Append collection to overlay body
                    count++;
                    
                    // Click
                    collectionLink.addEventListener('click', (e) => {
                        history.pushState(null, null, slug); // Redirect to collection
                        toggleOverlay(); // Close
                    });
                }
            }
        }

        if (date === window.overlayDate && !count) {
            // No supported collections found
            overlayBody.classList.add('empty');
            overlayBody.innerHTML = '<p class="fade-in-1-025">No supported collections found in your wallet. Suggest collections via <a href="https://twitter.com/traitmatch" target="_blank">Twitter</a>.</p>';
        }
    }
}

function openSupport() {
    toggleOverlay('Support', 'Please tweet or DM TraitMatch on <a href="https://twitter.com/traitmatch" target="_blank">Twitter</a> if you have any issues or find any bugs.<br /><br />Please also use <a href="https://twitter.com/traitmatch" target="_blank">Twitter</a> to suggest NFT collections that you would like to see TraitMatch support.<br /><br />Traitmatch is developed by <a href="https://twitter.com/adam_wj5" target="_blank">Adam WJ5</a>');
}