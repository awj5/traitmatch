'use strict';

/* Global vars */

window.homeLoadDate;
window.homeCollections = [];

/* On DOM load */

document.addEventListener('DOMContentLoaded', () => {

});

/* Home */

async function home() {
	const date = Date.now();
	window.homeLoadDate = date;
	window.homeCollections = []; // Reset
	document.querySelector('#home-collections').innerHTML = ''; // Clear
	const collections = await getSupportedCollections();
	
	// Get featured collections only
	for (let x = 0; x < collections.length; x++) {
		if (collections[x].featured) {
			window.homeCollections.push(collections[x]);
		}
	}
	
	loadHomeCollection(0); // Init
}

async function loadHomeCollection(num) {
	const date = window.homeLoadDate;
	const collection = window.homeCollections[num];
	const data = await getOSCollection(collection.slug);
	
	if (window.homeLoadDate === date) {
		const el = document.createElement('div');
		el.classList.add('home-collection');
		
		// Banner
		const banner = document.createElement('img');
		banner.src = data.banner_image_url;
		banner.classList.add('home-collection-banner');
		el.appendChild(banner);
		
		// Details
		el.innerHTML += `<div class="home-collection-details"><h4>${ collection.name }</h4><a href="">Connect to Play</a></div>`;
		
		// Profile image
		const profile = document.createElement('img');
		profile.src = data.image_url;
		profile.classList.add('home-collection-profile');
		el.appendChild(profile);
		
		document.querySelector('#home-collections').appendChild(el); // Add to DOM
		
		// Wait for images to load
		await banner.decode();
		await profile.decode();
		
		if (window.homeLoadDate === date) {
			el.classList.add('fade-in-1-025'); // Fade in
			
			// Next collection
			if (window.homeCollections.length - 1 > num) {
				loadHomeCollection(num + 1);
			}
		}
	}
}