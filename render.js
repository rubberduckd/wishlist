// Renders the wishlist navbar pills and card grids from data.json.
// GitHub Pages serves static files only, so the data lives in a JSON file
// loaded at runtime — no build step required.

const priceFormatter = new Intl.NumberFormat("en-US");

// Build one wishlist card for a single item, driven by the tab's columns.
// The `image` column becomes the card art, the `name` field the title,
// `price` columns become a glowing badge, and any other column renders as
// a small labelled meta line — so new columns in data.json just work.
function renderCard(tab, item, imageBase) {
	const imageCol = tab.columns.find(col => col.type === "image");
	const img = imageCol
		? `<div class="wish-card-img"><img src="${imageBase}${item[imageCol.field]}" alt="${item.name ?? ""}" loading="lazy" /></div>`
		: "";

	let title = "";
	let price = "";
	const meta = [];

	tab.columns.forEach(col => {
		if (col.type === "image") return;

		const value = item[col.field];

		if (col.field === "name") {
			title = `<h3 class="wish-card-title">${value ?? ""}</h3>`;
			return;
		}

		if (col.type === "price") {
			if (value !== undefined && value !== null && value !== "") {
				price = `<span class="wish-price">${priceFormatter.format(value)} 円</span>`;
			}
			return;
		}

		if (value !== undefined && value !== null && value !== "") {
			meta.push(`<span class="wish-meta"><span class="wish-meta-label">${col.label}</span>${value}</span>`);
		}
	});

	return `<article class="wish-card">
		${img}
		<div class="wish-card-body">
			${title}
			${meta.join("")}
			${price}
		</div>
	</article>`;
}

// Build the full responsive card grid for a table-type tab.
function renderGrid(tab, imageBase) {
	const cards = tab.items.map(item => renderCard(tab, item, imageBase)).join("");
	return `<div class="wish-grid">${cards}</div>`;
}

function render(data) {
	const tabList = document.getElementById("myTab");
	const tabContent = document.getElementById("myTabContent");

	data.tabs.forEach((tab, index) => {
		const active = index === 0;
		const tabId = `${tab.id}-tab`;

		// Nav pill.
		const li = document.createElement("li");
		li.className = "nav-item";
		li.setAttribute("role", "presentation");
		li.innerHTML = `<button class="nav-link${active ? " active" : ""}" id="${tabId}"
			data-bs-toggle="tab" data-bs-target="#${tab.id}" type="button" role="tab"
			aria-controls="${tab.id}" aria-selected="${active}">${tab.label}</button>`;
		tabList.appendChild(li);

		// Tab pane.
		const pane = document.createElement("div");
		pane.className = `tab-pane fade${active ? " show active" : ""}`;
		pane.id = tab.id;
		pane.setAttribute("role", "tabpanel");
		pane.setAttribute("aria-labelledby", tabId);
		pane.innerHTML = tab.type === "table"
			? renderGrid(tab, data.imageBase)
			: `<div class="home-pane">${tab.html || ""}</div>`;
		tabContent.appendChild(pane);
	});
}

document.addEventListener("DOMContentLoaded", () => {
	fetch("data.json")
		.then(response => {
			if (!response.ok) throw new Error(`Failed to load data.json: ${response.status}`);
			return response.json();
		})
		.then(render)
		.catch(error => {
			document.getElementById("myTabContent").innerHTML =
				`<p class="load-error">Could not load wishlist data: ${error.message}</p>`;
			console.error(error);
		});
});
