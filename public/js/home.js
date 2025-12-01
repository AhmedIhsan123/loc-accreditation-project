// Import timeAgo function

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

	// Setup main View Form button
	setupMainViewFormButton(dataObj.departments || []);
});

/* ----------------------------
   Main View Form Button Setup
   ---------------------------- */
function setupMainViewFormButton(departments) {
	const viewFormBtn = document.getElementById("main-view-form-btn");
	if (!viewFormBtn) return;

	viewFormBtn.onclick = () => {
		openDivisionsModal(departments);
	};
}

function openDivisionsModal(departments) {
	const modal = document.getElementById("form-modal");
	const body = document.getElementById("modal-body");
	const title = document.getElementById("modal-title");
	const backdrop = document.getElementById("modal-backdrop");

	if (!modal || !body || !title) return;

	title.textContent = "All Divisions";
	body.innerHTML = "";

	// Create a container for all divisions
	const divisionsContainer = document.createElement("div");
	divisionsContainer.classList.add("divisions-list");
	divisionsContainer.style.maxHeight = "100%";
	divisionsContainer.style.overflowY = "auto";

	departments.forEach((division) => {
		const divisionItem = document.createElement("div");
		divisionItem.style.marginBottom = "20px";
		divisionItem.style.padding = "15px";
		divisionItem.style.border = "1px solid #ddd";
		divisionItem.style.borderRadius = "8px";
		divisionItem.style.backgroundColor = "#f9f9f9";

		const divisionTitle = document.createElement("h2");
		divisionTitle.textContent = division.divisionName;
		divisionTitle.style.marginTop = "0";
		divisionTitle.style.color = "#2c882b";
		divisionTitle.style.borderBottom = "2px solid #2c882b";
		divisionTitle.style.paddingBottom = "10px";

		const contactsInfo = document.createElement("div");
		contactsInfo.style.fontSize = "14px";
		contactsInfo.style.lineHeight = "1.8";
		contactsInfo.style.marginBottom = "15px";
		contactsInfo.innerHTML = `
			<p><strong>Dean:</strong> ${division.deanName || "N/A"}</p>
			<p><strong>Chair:</strong> ${division.chairName || "N/A"}</p>
			<p><strong>Local Rep:</strong> ${division.locRep || "N/A"}</p>
			<p><strong>PEN:</strong> ${division.penContact || "N/A"}</p>
		`;

		const programsTitle = document.createElement("h3");
		programsTitle.textContent = "Programs";
		programsTitle.style.marginTop = "15px";
		programsTitle.style.marginBottom = "10px";
		programsTitle.style.color = "#2c882b";

		const programsList = document.createElement("div");
		programsList.style.marginTop = "0";

		if (division.programList && division.programList.length > 0) {
			division.programList.forEach((program) => {
				const programCard = document.createElement("div");
				programCard.style.marginBottom = "12px";
				programCard.style.paddingLeft = "15px";
				programCard.style.borderLeft = "3px solid #2c882b";
				programCard.style.paddingBottom = "10px";

				const programName = document.createElement("p");
				programName.innerHTML = `<strong>${program.programName}</strong>`;
				programName.style.marginBottom = "5px";
				programName.style.color = "#2c882b";

				const programDetails = document.createElement("div");
				programDetails.style.fontSize = "13px";
				programDetails.style.color = "#555";

				let detailsHTML = "";

				// Payees
				if (program.payees && Object.keys(program.payees).length > 0) {
					detailsHTML +=
						"<p style='margin: 5px 0;'><strong>Payees:</strong></p>";
					for (const [payeeName, amount] of Object.entries(program.payees)) {
						const displayAmount =
							typeof amount === "string" ? amount : `$${amount}`;
						detailsHTML += `<p style='margin: 3px 0; margin-left: 10px;'>• ${payeeName}: ${displayAmount}</p>`;
					}
				}

				// Status information
				if (program.hasBeenPaid !== undefined) {
					detailsHTML += `<p style='margin: 5px 0;'><strong>Paid:</strong> ${
						program.hasBeenPaid ? "Yes" : "No"
					}</p>`;
				}
				if (program.reportSubmitted !== undefined) {
					detailsHTML += `<p style='margin: 5px 0;'><strong>Report Submitted:</strong> ${
						program.reportSubmitted ? "Yes" : "No"
					}</p>`;
				}

				// Notes
				if (program.notes) {
					detailsHTML += `<p style='margin: 5px 0;'><strong>Notes:</strong> ${program.notes}</p>`;
				}

				programDetails.innerHTML = detailsHTML;
				programCard.append(programName, programDetails);
				programsList.appendChild(programCard);
			});
		} else {
			const noPrograms = document.createElement("p");
			noPrograms.textContent = "No programs available";
			noPrograms.style.fontStyle = "italic";
			noPrograms.style.color = "#999";
			programsList.appendChild(noPrograms);
		}

		divisionItem.append(
			divisionTitle,
			contactsInfo,
			programsTitle,
			programsList
		);
		divisionsContainer.appendChild(divisionItem);
	});

	body.appendChild(divisionsContainer);

	const downloadBtn = document.getElementById("modal-download");
	if (downloadBtn) {
		downloadBtn.onclick = () => downloadAllDivisionsAsPdf(departments);
	}

	const closeBtn = document.getElementById("modal-close");
	if (closeBtn) closeBtn.onclick = closeDivisionModal;
	if (backdrop) backdrop.onclick = closeDivisionModal;

	modal.style.display = "block";
}

function downloadAllDivisionsAsPdf(departments) {
	const element = document.querySelector(".divisions-list");
	if (!element) return;

	// Check if html2pdf is loaded
	if (typeof html2pdf === "undefined") {
		console.error("html2pdf library not loaded");
		alert("PDF download functionality is not available. Please try again.");
		return;
	}

	const opt = {
		margin: 10,
		filename: "all-divisions.pdf",
		image: { type: "jpeg", quality: 0.98 },
		html2canvas: { scale: 2 },
		jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
		pagebreak: { mode: ["avoid-all", "css", "legacy"] },
	};

	html2pdf().set(opt).from(element).save();
}

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
		fieldValue.innerHTML = entry.changes.replace(/\n/g, "<br>"); // summary

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
}

/* ----------------------------
   Modal helpers
   ---------------------------- */
function closeDivisionModal() {
	const modal = document.getElementById("form-modal");
	if (modal) modal.style.display = "none";
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
if (editFormSection) {
	editFormSection.addEventListener("click", () => {
		window.location.href = "/edit";
	});
}

/**
 * Update all changelog timestamps to show "time ago" format
 */
function updateChangelogTimestamps() {
	const timestampElements = document.querySelectorAll(".timestamp[data-time]");

	timestampElements.forEach((element) => {
		const timestamp = element.getAttribute("data-time");
		const changedBy = element.textContent.trim();

		if (timestamp) {
			const timeAgoText = timeAgo(timestamp);
			// Preserve the "by [username]" part if it exists
			element.textContent = changedBy
				? `${timeAgoText} ${changedBy}`
				: timeAgoText;
		}
	});

	// Update timestamps every minute to keep them fresh
	setInterval(() => {
		timestampElements.forEach((element) => {
			const timestamp = element.getAttribute("data-time");
			const changedBy = element.textContent.split(" by ")[1];

			if (timestamp) {
				const timeAgoText = timeAgo(timestamp);
				element.textContent = changedBy
					? `${timeAgoText} by ${changedBy}`
					: timeAgoText;
			}
		});
	}, 240000); // Update every 4 minutes
}
