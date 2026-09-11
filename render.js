// Renders the wishlist tabs and card grids from data.json.
// GitHub Pages serves static files only, so the data lives in a JSON file
// loaded at runtime. There is no build step.

const priceFormatter = new Intl.NumberFormat("en-US");
const DAY_MS = 24 * 60 * 60 * 1000;

function escapeHtml(value) {
	return String(value ?? "").replace(/[&<>"']/g, ch => ({
		"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
	})[ch]);
}

// Cloudinary resizes on request when a transformation is put in front of the
// version segment, so phones download a small copy instead of the original.
// c_limit stops it from upscaling images that are already small.
function imageUrl(base, path, width) {
	return `${base}f_auto,q_auto,c_limit,w_${width}/${path}`;
}

// Dates are "YYYY-MM-DD", or "YYYY-MM" when the day hasn't been announced.
// Returns the display text plus a short status such as "in 3 days".
function describeDate(value) {
	const [year, month, day] = value.split("-").map(Number);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const yearOption = year === today.getFullYear() ? undefined : "numeric";

	if (!day) {
		const monthName = new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: yearOption });
		const upcoming = new Date(year, month, 0) >= today;
		return { text: `${monthName}, day TBA`, status: upcoming ? "" : "released", upcoming };
	}

	const date = new Date(year, month - 1, day);
	const days = Math.round((date - today) / DAY_MS);
	const text = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: yearOption });
	let status = "released";
	if (days === 0) status = "today";
	else if (days === 1) status = "tomorrow";
	else if (days > 1) status = `in ${days} days`;
	return { text, status, upcoming: days >= 0 };
}

function renderCard(item, imageBase) {
	const name = escapeHtml(item.name);
	const src = width => escapeHtml(imageUrl(imageBase, item.img, width));
	const srcset = [320, 480, 640].map(width => `${src(width)} ${width}w`).join(", ");

	let date = "";
	if (item.date) {
		const { text, status, upcoming } = describeDate(item.date);
		const when = status ? ` <span class="card-when">${status}</span>` : "";
		date = `<p class="card-date${upcoming ? " is-upcoming" : ""}"><time datetime="${escapeHtml(item.date)}">${text}</time>${when}</p>`;
	}

	const price = item.price != null
		? `<p class="card-price"><span>max</span> ${priceFormatter.format(item.price)}円</p>`
		: "";

	return `<li class="card">
		<button class="card-img" type="button" data-full="${src(1200)}" data-name="${name}" aria-label="Show larger photo of ${name}">
			<img src="${src(480)}" srcset="${srcset}" sizes="(max-width: 639px) 50vw, 260px" alt="" loading="lazy" decoding="async">
		</button>
		<div class="card-body">
			<h3 class="card-title">${name}</h3>
			${date}
			${price}
		</div>
	</li>`;
}

function renderPanel(tab, imageBase) {
	const note = tab.description ? `<p class="panel-note">${escapeHtml(tab.description)}</p>` : "";
	const list = tab.items.length
		? `<ul class="grid">${tab.items.map(item => renderCard(item, imageBase)).join("")}</ul>`
		: `<p class="panel-empty">Nothing on this list yet.</p>`;
	return note + list;
}

function selectTab(id, { focus = false } = {}) {
	const tabs = [...document.querySelectorAll('#tabs [role="tab"]')];
	const selected = tabs.find(tab => tab.dataset.id === id) ?? tabs[0];
	if (!selected) return;

	tabs.forEach(tab => {
		const isSelected = tab === selected;
		tab.setAttribute("aria-selected", isSelected);
		tab.tabIndex = isSelected ? 0 : -1;
		document.getElementById(tab.getAttribute("aria-controls")).hidden = !isSelected;
	});

	if (focus) selected.focus();

	// Center the selected tab in the bar, which scrolls sideways on phones.
	const bar = selected.parentElement;
	bar.scrollTo({ left: selected.offsetLeft - (bar.clientWidth - selected.offsetWidth) / 2, behavior: "smooth" });

	// When switching tabs from further down the page, jump back to the start
	// of the new list instead of leaving the reader somewhere in the middle.
	const panels = document.getElementById("panels");
	const barHeight = document.querySelector(".tabs-wrap").offsetHeight;
	const listTop = panels.getBoundingClientRect().top + window.scrollY - barHeight - 16;
	if (window.scrollY > listTop) window.scrollTo({ top: listTop });

	// Keep the tab in the URL so a link can open straight to it.
	history.replaceState(null, "", `#${selected.dataset.id}`);
}

function render(data) {
	const tabList = document.getElementById("tabs");
	const panels = document.getElementById("panels");

	data.tabs.forEach(tab => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "tab";
		button.id = `tab-${tab.id}`;
		button.dataset.id = tab.id;
		button.setAttribute("role", "tab");
		button.setAttribute("aria-controls", `panel-${tab.id}`);
		button.innerHTML = `${escapeHtml(tab.label)} <span class="tab-count">${tab.items.length}</span>`;
		button.addEventListener("click", () => selectTab(tab.id));
		tabList.appendChild(button);

		const panel = document.createElement("section");
		panel.className = "panel";
		panel.id = `panel-${tab.id}`;
		panel.hidden = true;
		panel.setAttribute("role", "tabpanel");
		panel.setAttribute("aria-labelledby", button.id);
		panel.innerHTML = renderPanel(tab, data.imageBase);
		panels.appendChild(panel);
	});

	// Arrow keys, Home and End move between tabs.
	tabList.addEventListener("keydown", event => {
		const tabs = [...tabList.querySelectorAll('[role="tab"]')];
		const current = tabs.indexOf(document.activeElement);
		const next = {
			ArrowRight: current + 1,
			ArrowLeft: current - 1,
			Home: 0,
			End: tabs.length - 1
		}[event.key];
		if (next === undefined) return;
		event.preventDefault();
		selectTab(tabs[(next + tabs.length) % tabs.length].dataset.id, { focus: true });
	});

	selectTab(decodeURIComponent(location.hash.slice(1)));
	window.addEventListener("hashchange", () => selectTab(decodeURIComponent(location.hash.slice(1))));
}

// Tapping a photo opens it full size. Any tap closes it again.
function setUpViewer() {
	const viewer = document.getElementById("viewer");
	const img = viewer.querySelector("img");
	const caption = viewer.querySelector("figcaption");

	document.getElementById("panels").addEventListener("click", event => {
		const button = event.target.closest(".card-img");
		if (!button) return;
		img.src = button.dataset.full;
		img.alt = button.dataset.name;
		caption.textContent = button.dataset.name;
		viewer.showModal();
	});

	viewer.addEventListener("click", () => viewer.close());
	viewer.addEventListener("close", () => img.removeAttribute("src"));
}

document.addEventListener("DOMContentLoaded", () => {
	setUpViewer();
	fetch("data.json", { cache: "no-cache" })
		.then(response => {
			if (!response.ok) throw new Error(`data.json returned HTTP ${response.status}`);
			return response.json();
		})
		.then(render)
		.catch(error => {
			document.getElementById("panels").innerHTML =
				`<p class="load-error">The wishlist didn't load: ${escapeHtml(error.message)}. Reload the page to try again.</p>`;
			console.error(error);
		});
});
