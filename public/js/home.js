// Initialize after DOM ready to avoid running before elements exist
window.addEventListener("DOMContentLoaded", () => {
	// Global variables
	const container = document.getElementById("division-cards-section");
	if (!container) {
		console.warn("#division-cards-section not found; skipping card creation");
		return;
	}

	// Use server-provided departments injected by the template
	const dataObj = { departments: window.serverDepartments || [] };
	const dataObj2 = { changelogs: window.changelogs || [] };

	createDivisionCards(dataObj);

	// 🔥 Build changelog list dynamically
	buildChangelogList(dataObj2.changelogs);
});

/* ----------------------------
   Changelog List Builder
   ---------------------------- */
function buildChangelogList(changelogs) {
	const list = document.getElementById("history-list");
	if (!list) return;

	// Clear existing static HTML
	list.innerHTML = "";

	// Sort newest first
	const sorted = [...changelogs].sort(
		(a, b) => new Date(b.save_time) - new Date(a.save_time)
	);

	sorted.forEach((entry) => {
		const li = document.createElement("li");
		li.classList.add("history-item");

		const fieldName = document.createElement("span");
		fieldName.classList.add("field-name");
		fieldName.textContent = `Anonymous User`;

		const fieldValue = document.createElement("span");
		fieldValue.classList.add("field-value");
		fieldValue.textContent = entry.changes.split("\n")[0]; // summary

		const timestamp = document.createElement("span");
		timestamp.classList.add("timestamp");
		timestamp.textContent = timeAgo(entry.save_time);

		li.append(fieldName, fieldValue, timestamp);
		list.appendChild(li);
	});
}

/* ----------------------------
   Time Ago Helper
   ---------------------------- */
function timeAgo(dateStr) {
	const diff = (Date.now() - new Date(dateStr)) / 1000;

	if (diff < 60) return "Just now";
	if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;

	const days = Math.floor(diff / 86400);
	return days === 1 ? "Yesterday" : `${days} days ago`;
}

/* ----------------------------
   Division Cards
   ---------------------------- */
function createDivisionCards(data) {
	(data.departments || []).forEach((division) => {
		const card = document.createElement("div");
		card.classList.add("div-card");

		const titleDiv = document.createElement("div");
		titleDiv.classList.add("card-title");

		const p = document.createElement("p");
		p.textContent = division.divisionName;

		titleDiv.appendChild(p);
		card.appendChild(titleDiv);

		// Fill data into card
		fillCardData(card, division);

		// Append to container
		document.getElementById("division-cards-section").appendChild(card);
	});
}

function fillCardData(card, division) {
	const contactsDiv = document.createElement("div");
	contactsDiv.classList.add("card-contacts");

	const dean = document.createElement("p");
	dean.textContent = `Dean: ${division.deanName}`;
	const chair = document.createElement("p");
	chair.textContent = `Chair: ${division.chairName}`;
	const loc = document.createElement("p");
	loc.textContent = `Local Rep: ${division.locRep}`;
	const pen = document.createElement("p");
	pen.textContent = `PEN: ${division.penContact}`;

	contactsDiv.append(dean, chair, loc, pen);
	card.appendChild(contactsDiv);

	const programsContainer = document.createElement("div");
	programsContainer.classList.add("programs-container");

	division.programList.forEach((program) => {
		const programCard = document.createElement("div");
		programCard.classList.add("program-card");

		const programName = document.createElement("p");
		programName.textContent = program.programName;

		programCard.appendChild(programName);
		programsContainer.appendChild(programCard);
	});

	card.appendChild(programsContainer);

	const viewBtn = document.createElement("button");
	viewBtn.classList.add("view-form-btn");
	viewBtn.style.zIndex = 999;
	viewBtn.textContent = "View Form";
	viewBtn.onclick = (e) => {
		e.stopPropagation();
		openDivisionModal(division);
	};
	card.appendChild(viewBtn);
}

/* ----------------------------
   Modal helpers
   ---------------------------- */
function openDivisionModal(division) {
	const modal = document.getElementById("form-modal");
	const body = document.getElementById("modal-body");
	const title = document.getElementById("modal-title");
	const backdrop = document.getElementById("modal-backdrop");

	if (!modal || !body || !title) return;

	title.textContent = `${division.divisionName} — Form`;

	body.innerHTML = "";

	embedDivisionPdfIframe(division);

	const downloadBtn = document.getElementById("modal-download");
	if (downloadBtn)
		downloadBtn.onclick = () => triggerDivisionPdfDownload(division);
	const closeBtn = document.getElementById("modal-close");
	if (closeBtn) closeBtn.onclick = closeDivisionModal;
	if (backdrop) backdrop.onclick = closeDivisionModal;

	modal.style.display = "block";
}

function closeDivisionModal() {
	const modal = document.getElementById("form-modal");
	if (modal) modal.style.display = "none";
}

function downloadDivisionAsPdf(division) {
	const modalBody = document.getElementById("modal-body");
	const oldPdfContainer = document.getElementById("pdf-container");
	if (oldPdfContainer) oldPdfContainer.remove();

	let url = "";
	if (division.divisionName) {
		url = `/download-division-pdf?division=${encodeURIComponent(
			division.divisionName
		)}`;
	}

	const pdfContainer = document.createElement("div");
	pdfContainer.id = "pdf-container";
	pdfContainer.style.width = "100%";
	pdfContainer.style.height = "600px";
	pdfContainer.style.border = "1px solid #e0e0e0";
	pdfContainer.style.borderRadius = "8px";
	pdfContainer.style.overflow = "hidden";
	pdfContainer.style.background = "#f5f5f5";
	pdfContainer.style.marginTop = "16px";

	const iframe = document.createElement("iframe");
	iframe.id = "pdf-preview-iframe";
	iframe.src = url;
	iframe.title = "PDF Document";
	iframe.style.width = "100%";
	iframe.style.height = "100%";
	iframe.style.border = "none";

	pdfContainer.appendChild(iframe);
	modalBody.appendChild(pdfContainer);

	let downloadLink = document.getElementById("pdf-download-link");
	if (downloadLink) downloadLink.remove();
	downloadLink = document.createElement("a");
	downloadLink.id = "pdf-download-link";
	downloadLink.href = url;
	downloadLink.textContent = "Download PDF";
	downloadLink.style.display = "block";
	downloadLink.style.margin = "12px 0";
	downloadLink.style.fontWeight = "bold";
	downloadLink.setAttribute("download", "");
	modalBody.appendChild(downloadLink);
}

function embedDivisionPdfIframe(division) {
	const modalBody = document.getElementById("modal-body");
	const oldPdfContainer = document.getElementById("pdf-container");
	if (oldPdfContainer) oldPdfContainer.remove();

	let url = "";
	if (division.divisionName) {
		url = `/pdf-preview?division=${encodeURIComponent(division.divisionName)}`;
	}

	const pdfContainer = document.createElement("div");
	pdfContainer.id = "pdf-container";
	pdfContainer.style.width = "100%";
	pdfContainer.style.height = "600px";
	pdfContainer.style.border = "1px solid #e0e0e0";
	pdfContainer.style.borderRadius = "8px";
	pdfContainer.style.overflow = "hidden";
	pdfContainer.style.background = "#f5f5f5";
	pdfContainer.style.marginTop = "16px";

	const iframe = document.createElement("iframe");
	iframe.id = "pdf-preview-iframe";
	iframe.src = url;
	iframe.title = "PDF Document";
	iframe.style.width = "100%";
	iframe.style.height = "100%";
	iframe.style.border = "none";

	pdfContainer.appendChild(iframe);
	modalBody.appendChild(pdfContainer);
}

function triggerDivisionPdfDownload(division) {
	let url = "";
	if (division.divisionName) {
		url = `/download-division-pdf-file?division=${encodeURIComponent(
			division.divisionName
		)}`;
	}
	window.open(url, "_blank");
}

function renderPdfWithPdfjs(url, container) {
	container.innerHTML = "";
	const loadingTask = window.pdfjsLib.getDocument(url);
	loadingTask.promise.then(function (pdf) {
		pdf.getPage(1).then(function (page) {
			const viewport = page.getViewport({ scale: 1.2 });
			const canvas = document.createElement("canvas");
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			container.appendChild(canvas);
			const ctx = canvas.getContext("2d");
			const renderContext = { canvasContext: ctx, viewport: viewport };
			page.render(renderContext);
		});
	});
}

const editFormSection = document.getElementById("edit-form-section");
editFormSection.addEventListener("click", () => {
	window.location.href = "/edit";
});
