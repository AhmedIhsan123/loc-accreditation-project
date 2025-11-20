/**
 * division-form-option-A.js
 * Option A: Clean rewrite preserving original logic and behavior.
 * - Improved formatting, consistent naming
 * - Added clearer in-line comments and JSDoc-style documentation
 * - No functional changes from the original file
 */

/* ==============================
   FORM DATA
   ============================== */
/**
 * Holds server-provided departments array.
 * This mirrors the backend payload exactly.
 */
const data = { departments: window.serverDepartments || [] };

/**
 * Stores a snapshot of the form before edits begin.
 * This allows canceling edits and restoring prior values.
 */
let originalState = null;

/* ==============================
   DOM REFERENCES
   ============================== */
const divSelector = document.getElementById("division-select");
const programsArray = document.querySelectorAll(".program");

// Division-level input fields
const deanInput = document.getElementById("dean-input");
const penInput = document.getElementById("pen-input");
const locInput = document.getElementById("loc-input");
const chairInput = document.getElementById("chair-input");

// Master form buttons
const editFormBtn = document.getElementById("edit-form-btn");
const saveFormBtn = document.getElementById("save-form-btn");
const cancelFormBtn = document.getElementById("cancel-form-btn");
const showMoreBtn = document.getElementById("show-more-btn");

/* ==============================
   DIVISION SELECTION HANDLER
   ============================== */
/**
 * Handles selecting a division from the dropdown.
 * Loads its data and reveals the correct program cards.
 */
divSelector.addEventListener("change", () => {
	const selectedDivision = divSelector.value;

	// User cleared the selection
	if (!selectedDivision) {
		resetDivisionForm();
		return;
	}

	// Reveal edit button
	editFormBtn.style.display = "inline-block";
	showMoreBtn.style.display = "inline-block";

	// Load all program cards for this division
	showProgramCards(selectedDivision);

	// Extract division-level info from the selected <option>
	const option = divSelector.selectedOptions[0];
	deanInput.value = option.dataset.dean || "";
	penInput.value = option.dataset.pen || "";
	locInput.value = option.dataset.loc || "";
	chairInput.value = option.dataset.chair || "";
});

/* ==============================
   SHOW PROGRAM CARDS
   ============================== */
/**
 * Reveals all program cards that belong to a given division.
 * Hides all program cards first, then selectively shows matching ones.
 * @param {string} divisionName
 */
function showProgramCards(divisionName) {
	// Hide all program cards
	programsArray.forEach((program) => (program.style.display = "none"));

	// Find division data
	const division = data.departments.find(
		(d) => d.divisionName === divisionName
	);
	if (!division || !division.programList) return;

	// Reveal cards for all non-under-review programs
	division.programList.forEach((prog) => {
		const safeId = `${prog.programName}-program`;
		const programCard = document.getElementById(safeId);
		if (programCard && prog.underReview) {
			programCard.style.display = "block";
			setupProgramButtons(programCard);
		}
	});
}

/* ==============================
   SETUP PROGRAM BUTTONS
   ============================== */
/**
 * Wires up add/remove payee buttons for a given program card.
 * Ensures each card is only initialized once.
 * @param {HTMLElement} programCard
 */
function setupProgramButtons(programCard) {
	// Prevent double-initializing the same card
	if (programCard.dataset.initialized === "true") return;
	programCard.dataset.initialized = "true";

	const addBtn = programCard.querySelector(".add-payee-btn");
	const removeBtns = programCard.querySelectorAll(".remove-payee-btn");

	/* ----- Add Payee Button ----- */
	if (addBtn) {
		addBtn.addEventListener("click", () => {
			const payeeContainer = programCard.querySelector(".payee-container");
			const payeeCount =
				payeeContainer.querySelectorAll(".payee-item").length + 1;

			const newDiv = document.createElement("div");
			newDiv.className = "payee-item";
			newDiv.innerHTML = `
        <label>Payee #${payeeCount}</label>
        <div class="program-payee-input-section grid">
          <input type="text" placeholder="Name">
          <input type="number" placeholder="$" step="0.01">
          <button type="button" class="remove-payee-btn">Remove</button>
        </div>
      `;

			payeeContainer.insertBefore(newDiv, addBtn);

			// Wire remove button for the newly added payee
			const removeBtn = newDiv.querySelector(".remove-payee-btn");
			removeBtn.addEventListener("click", () => {
				newDiv.remove();
				updatePayeeLabels(payeeContainer);
			});
		});
	}

	/* ----- Existing Remove Buttons ----- */
	removeBtns.forEach((btn) => {
		btn.addEventListener("click", (e) => {
			const parent = e.target.closest(".payee-item");
			if (!parent) return; // defensive: ensure parent exists
			parent.remove();
			const payeeContainer = programCard.querySelector(".payee-container");
			updatePayeeLabels(payeeContainer);
		});
	});
}

/* ==============================
   UPDATE PAYEE LABELS
   ============================== */
/**
 * Renumbers payee labels after additions/deletions.
 * @param {HTMLElement} container
 */
function updatePayeeLabels(container) {
	const allPayees = container.querySelectorAll(".payee-item");
	allPayees.forEach((p, i) => {
		const label = p.querySelector("label");
		if (label) label.textContent = `Payee #${i + 1}`;
	});
}

/* ==============================
   SAVE CURRENT STATE
   ============================== */
/**
 * Captures the full current form state so that it can be restored
 * if the user chooses to cancel edits.
 */
function saveCurrentState() {
	originalState = {
		dean: deanInput.value,
		pen: penInput.value,
		loc: locInput.value,
		chair: chairInput.value,
		programs: [],
	};

	programsArray.forEach((program) => {
		if (program.style.display === "none") return;

		const titleEl = program.querySelector(".p-title");
		const programName = titleEl ? titleEl.textContent : "";
		const payees = {};

		// Harvest payees
		program.querySelectorAll(".payee-item").forEach((item) => {
			const nameInput = item.querySelector("input[type='text']");
			const amountInput = item.querySelector("input[type='number']");
			const name = nameInput ? nameInput.value.trim() : "";
			const amount = amountInput ? amountInput.value : "";
			if (name) payees[name] = amount;
		});

		const checkboxes = program.querySelectorAll(
			".program-money-section input[type='checkbox']"
		);
		const notesEl = program.querySelector("textarea");
		const notes = notesEl ? notesEl.value : "";

		originalState.programs.push({
			programName,
			hasBeenPaid: !!(checkboxes[0] && checkboxes[0].checked),
			reportSubmitted: !!(checkboxes[1] && checkboxes[1].checked),
			notes,
			payees,
		});
	});
}

/* ==============================
   RESTORE ORIGINAL STATE
   ============================== */
/**
 * Restores all division and program data to the last saved snapshot.
 */
function restoreOriginalState() {
	if (!originalState) return;

	// Restore division-level inputs
	deanInput.value = originalState.dean;
	penInput.value = originalState.pen;
	locInput.value = originalState.loc;
	chairInput.value = originalState.chair;

	// Restore each visible program
	programsArray.forEach((program) => {
		if (program.style.display === "none") return;

		const titleEl = program.querySelector(".p-title");
		const programName = titleEl ? titleEl.textContent : "";
		const savedProgram = originalState.programs.find(
			(p) => p.programName === programName
		);
		if (!savedProgram) return;

		// Restore checkbox state (defensive checks in place)
		const checkboxes = program.querySelectorAll(
			".program-money-section input[type='checkbox']"
		);
		if (checkboxes[0]) checkboxes[0].checked = !!savedProgram.hasBeenPaid;
		if (checkboxes[1]) checkboxes[1].checked = !!savedProgram.reportSubmitted;

		// Restore notes
		const notes = program.querySelector("textarea");
		if (notes) notes.value = savedProgram.notes || "";

		// Restore payees: wipe existing then recreate disabled payee rows
		const payeeContainer = program.querySelector(".payee-container");
		if (!payeeContainer) return;
		const addBtn = payeeContainer.querySelector(".add-payee-btn");

		// Remove existing payees
		const existingPayees = payeeContainer.querySelectorAll(".payee-item");
		existingPayees.forEach((item) => item.remove());

		// Recreate payees from saved snapshot
		let payeeIndex = 1;
		for (const [name, amount] of Object.entries(savedProgram.payees || {})) {
			const newDiv = document.createElement("div");
			newDiv.className = "payee-item";

			// Insert disabled inputs to match original behaviour (read-only after restore)
			newDiv.innerHTML = `
        <label>Payee #${payeeIndex}</label>
        <div class="program-payee-input-section grid">
          <input type="text" value="${escapeHtml(name)}" disabled>
          <input type="number" value="${escapeHtml(amount)}" disabled>
          <button type="button" class="remove-payee-btn" disabled>Remove</button>
        </div>
      `;

			payeeContainer.insertBefore(newDiv, addBtn);

			// Attach a defensive listener to the (disabled) remove button in case it becomes enabled later
			const removeBtn = newDiv.querySelector(".remove-payee-btn");
			if (removeBtn) {
				removeBtn.addEventListener("click", () => {
					newDiv.remove();
					updatePayeeLabels(payeeContainer);
				});
			}

			payeeIndex++;
		}
	});

	// Clear snapshot after restore to avoid accidental reuse
	originalState = null;
}

/* ==============================
   Helper: escapeHtml
   ============================== */
/**
 * Simple HTML escape for attribute values inserted into innerHTML strings.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
	if (str == null) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/* ==============================
   SET FORM EDITABLE STATE
   ============================== */
/**
 * Toggles form interactivity for both division-level inputs and visible program cards.
 * @param {boolean} editable - true to make fields editable, false to make read-only
 */
function setFormEditable(editable) {
	// Division inputs
	deanInput.disabled = !editable;
	penInput.disabled = !editable;
	locInput.disabled = !editable;
	chairInput.disabled = !editable;

	// Program-level controls (only for visible program cards)
	programsArray.forEach((program) => {
		if (program.style.display === "none") return;

		const payeeInputs = program.querySelectorAll(
			".program-payee-input-section input"
		);
		const removeBtns = program.querySelectorAll(".remove-payee-btn");
		const addBtn = program.querySelector(".add-payee-btn");
		const checkboxes = program.querySelectorAll(
			".program-money-section input[type='checkbox']"
		);
		const notes = program.querySelector("textarea");

		payeeInputs.forEach((i) => (i.disabled = !editable));
		removeBtns.forEach((b) => (b.disabled = !editable));
		if (addBtn) addBtn.disabled = !editable;
		checkboxes.forEach((b) => (b.disabled = !editable));
		if (notes) notes.disabled = !editable;
	});
}

/* ==============================
   MASTER FORM BUTTONS
   ============================== */
/**
 * Click handler for the "Edit" master button.
 * - Saves a snapshot of current data
 * - Makes fields editable
 * - Shows the Save / Cancel buttons
 */
editFormBtn.addEventListener("click", () => {
	saveCurrentState();
	setFormEditable(true);

	editFormBtn.style.display = "none";
	saveFormBtn.style.display = "inline-block";
	cancelFormBtn.style.display = "inline-block";
});

/**
 * Click handler for the "Cancel" master button.
 * - Restores snapshot and returns the form to read-only
 */
cancelFormBtn.addEventListener("click", () => {
	restoreOriginalState();
	setFormEditable(false);

	editFormBtn.style.display = "inline-block";
	saveFormBtn.style.display = "none";
	cancelFormBtn.style.display = "none";
});

/* ==============================
   SAVE MASTER FORM (FULL UPDATE)
   ============================== */
/**
 * Collects the current, editable form state and sends it to the server.
 * Uses the same API endpoint as the original implementation.
 */
saveFormBtn.addEventListener("click", async () => {
	const divisionName = divSelector.value;
	if (!divisionName) return alert("Please select a division.");

	// Build payload
	const divisionUpdate = {
		divisionName,
		dean: deanInput.value.trim(),
		pen: penInput.value.trim(),
		loc: locInput.value.trim(),
		chair: chairInput.value.trim(),
		programs: [],
	};

	programsArray.forEach((program) => {
		if (program.style.display === "none") return;

		const titleEl = program.querySelector(".p-title");
		const programName = titleEl ? titleEl.textContent : "";
		const payees = {};

		program.querySelectorAll(".payee-item").forEach((item) => {
			const nameInput = item.querySelector("input[type='text']");
			const amountInput = item.querySelector("input[type='number']");
			const name = nameInput ? nameInput.value.trim() : "";
			const raw = amountInput ? amountInput.value : "";
			const amount = raw === "" ? null : parseFloat(raw);
			if (name) payees[name] = amount;
		});

		const checkboxes = program.querySelectorAll(
			".program-money-section input[type='checkbox']"
		);
		const notes = program.querySelector("textarea")
			? program.querySelector("textarea").value.trim()
			: "";

		divisionUpdate.programs.push({
			programName,
			hasBeenPaid: !!(checkboxes[0] && checkboxes[0].checked),
			reportSubmitted: !!(checkboxes[1] && checkboxes[1].checked),
			notes,
			payees,
		});
	});

	// Send to backend
	try {
		const res = await fetch("/api/division/full-update", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(divisionUpdate),
		});
		if (!res.ok) throw new Error("Failed to save");

		alert("Changes saved successfully!");

		// Reset UI
		setFormEditable(false);
		editFormBtn.style.display = "inline-block";
		saveFormBtn.style.display = "none";
		cancelFormBtn.style.display = "none";
		originalState = null;

		// Reload to reflect server-side changes (matches original behaviour)
		window.location.reload();
	} catch (err) {
		console.error(err);
		alert("Error saving changes.");
	}
});

/* ==============================
   HELPER: RESET DIVISION FORM
   ============================== */
/**
 * Clears all division-level inputs, hides buttons and hides program cards.
 */
function resetDivisionForm() {
	deanInput.value = "";
	penInput.value = "";
	locInput.value = "";
	chairInput.value = "";

	editFormBtn.style.display = "none";
	saveFormBtn.style.display = "none";
	cancelFormBtn.style.display = "none";

	programsArray.forEach((program) => (program.style.display = "none"));
}
