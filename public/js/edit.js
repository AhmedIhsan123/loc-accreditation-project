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
	DOM HELPERS
	============================== */
function safeGetByIdOrName(id, name) {
	// Try by id first, then by name attribute, then data-field.
	let el = document.getElementById(id);
	if (el) return el;
	if (name) {
		el = document.querySelector(`[name="${name}"]`);
		if (el) {
			el.id = id; // set ID so later code can rely on it
			return el;
		}
	}
	el = document.querySelector(`[data-field="${name || id}"]`);
	if (el) {
		if (!el.id) el.id = id;
		return el;
	}
	return null;
}

function ensureProgramHasId(program) {
	if (!program.id || program.id.trim() === "") {
		const titleEl = program.querySelector(".p-title");
		const name =
			(titleEl && titleEl.textContent && titleEl.textContent.trim()) ||
			"program";
		const safeId = `${name.replace(/\s+/g, "-").toLowerCase()}-program`;
		program.id = safeId;
	}
	return program.id;
}

function ensurePayeeFieldNames(program) {
	const programId = ensureProgramHasId(program);
	const payeeContainer = program.querySelector(".payee-container");
	if (!payeeContainer) return;
	const payeeItems = payeeContainer.querySelectorAll(".payee-item");
	Array.from(payeeItems).forEach((item, idx) => {
		const nameInput = item.querySelector("input[type='text']");
		const amountInput = item.querySelector("input[type='number']");
		if (nameInput) {
			if (!nameInput.name)
				nameInput.name = `${programId}-payee-name-${idx + 1}`;
			if (!nameInput.id) nameInput.id = `${programId}-payee-name-${idx + 1}`;
		}
		if (amountInput) {
			if (!amountInput.name)
				amountInput.name = `${programId}-payee-amount-${idx + 1}`;
			if (!amountInput.id)
				amountInput.id = `${programId}-payee-amount-${idx + 1}`;
		}
	});
}

/* ==============================
	DOM REFERENCES
	============================== */
// Division selection (try both ID and name)
const divSelector = safeGetByIdOrName("division-select", "division");

// All program nodes
let programsArray = document.querySelectorAll(".program");

// Division-level input fields: try ID then name then data-field, and ensure they have IDs
const deanInput = safeGetByIdOrName("dean-input", "dean");
const penInput = safeGetByIdOrName("pen-input", "pen");
const locInput = safeGetByIdOrName("loc-input", "loc");
const chairInput = safeGetByIdOrName("chair-input", "chair");

// Master form buttons (try ID then name)
const editFormBtn = safeGetByIdOrName("edit-form-btn", "edit");
const saveFormBtn = safeGetByIdOrName("save-form-btn", "save");
const cancelFormBtn = safeGetByIdOrName("cancel-form-btn", "cancel");
const showMoreBtn = safeGetByIdOrName("show-more-btn", "show-more");
const addProgramBtn = safeGetByIdOrName("add-program-btn", "add-program");
const returnBtn = safeGetByIdOrName("return-btn", "return");

// Ensure essential DOM elements exist; fail early with console warnings
if (!divSelector)
	console.warn(
		"Division selector not found (expected #division-select or [name=division])."
	);
if (!deanInput)
	console.warn("Dean input not found (expected #dean-input or [name=dean]).");
if (!penInput)
	console.warn("PEN input not found (expected #pen-input or [name=pen]).");
if (!locInput)
	console.warn("LOC input not found (expected #loc-input or [name=loc]).");
if (!chairInput)
	console.warn(
		"Chair input not found (expected #chair-input or [name=chair])."
	);
if (!editFormBtn)
	console.warn("Edit button not found (expected #edit-form-btn).");
if (!saveFormBtn)
	console.warn("Save button not found (expected #save-form-btn).");
if (!cancelFormBtn)
	console.warn("Cancel button not found (expected #cancel-form-btn).");
if (!showMoreBtn)
	console.warn("Show more button not found (expected #show-more-btn).");
if (!addProgramBtn)
	console.warn("Add program button not found (expected #add-program-btn).");
if (!returnBtn) console.warn("Return button not found (expected #return-btn).");

// If showMoreBtn exists but has no value set, default it to "false"
if (showMoreBtn && typeof showMoreBtn.value === "undefined")
	showMoreBtn.value = "false";

/* ==============================
	SYNCHRONIZE EXISTING PROGRAM/INPUT ATTRIBUTES
	============================== */
// Ensure every program has a valid ID and ensure payee inputs within have name/id attributes
Array.from(document.querySelectorAll(".program")).forEach((program) => {
	// Ensure program has an ID matching the title
	ensureProgramHasId(program);

	// If the program title doesn't exist, try to set consistent title based on the id
	let titleEl = program.querySelector(".p-title");
	if (!titleEl) {
		titleEl = document.createElement("p");
		titleEl.className = "p-title";
		titleEl.textContent = program.id
			.replace(/-program$/, "")
			.replace(/-/g, " ");
		program.insertBefore(titleEl, program.firstChild);
	}

	// Ensure payee inputs have names and IDs
	ensurePayeeFieldNames(program);

	// Ensure add-payee button has a name attribute for form.submit clarity
	const addBtn = program.querySelector(".add-payee-btn");
	if (addBtn && !addBtn.name) addBtn.name = `${program.id}-add-payee-btn`;

	// Ensure remove buttons have data attributes referencing their program
	const removeProgramBtns = program.querySelectorAll(".remove-program-btn");
	removeProgramBtns.forEach((b) => {
		if (!b.dataset.programId) b.dataset.programId = program.id;
	});
});

// Refresh programsArray in case IDs/nodes updated
programsArray = document.querySelectorAll(".program");
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

	// Load all program cards for this division if "Show More" is enabled; otherwise show only programs under review
	if (showMoreBtn.value == "false") {
		showProgramCards(selectedDivision, false);
	} else {
		showProgramCards(selectedDivision, true);
	}

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
function showProgramCards(divisionName, showAll) {
	// Hide all program cards
	programsArray.forEach((program) => (program.style.display = "none"));

	// Find division data
	const division = data.departments.find(
		(d) => d.divisionName === divisionName
	);
	if (!division || !division.programList) return;

	// Reveal cards for all under-review programs
	division.programList.forEach((prog) => {
		const safeId = `${prog.programName}-program`;
		const programCard = document.getElementById(safeId);
		if (!showAll) {
			if (programCard && prog.underReview) {
				programCard.style.display = "block";
				setupProgramButtons(programCard);
			}
		} else {
			if (programCard) {
				programCard.style.display = "block";
				setupProgramButtons(programCard);
			}
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
	const removePayeeBtns = programCard.querySelectorAll(".remove-payee-btn");
	const removeProgramBtns = programCard.querySelectorAll(".remove-program-btn");

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
			const removePayeeBtn = newDiv.querySelector(".remove-payee-btn");
			removePayeeBtn.addEventListener("click", () => {
				newDiv.remove();
				updatePayeeLabels(payeeContainer);
			});
		});
	}

	/* ----- Existing Remove Payee Buttons ----- */
	removePayeeBtns.forEach((btn) => {
		btn.addEventListener("click", (e) => {
			const parent = e.target.closest(".payee-item");
			if (!parent) return; // defensive: ensure parent exists
			parent.remove();
			const payeeContainer = programCard.querySelector(".payee-container");
			updatePayeeLabels(payeeContainer);
		});
	});

	/* ----- Existing Remove Program Buttons ----- */
	removeProgramBtns.forEach((btn) => {
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			// Remove the whole program card. Prefer the closest .program element,
			// falling back to the programCard passed into this initializer.
			const programElem = e.target.closest(".program") || programCard;
			if (!programElem) return;
			programElem.remove();

			// If needed, hide the edit button when no visible programs remain
			const anyVisible = document
				.querySelectorAll(".program")
				.some((p) => p.style.display !== "none" && document.body.contains(p));
			if (!anyVisible) editFormBtn.style.display = "none";
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
		programPositions: {}, // Track original positions
		programNames: [], // Track all program names that existed at save time
	};

	getVisiblePrograms().forEach((program) => {
		if (program.dataset.newProgram === "true") return; // Skip new ones
		const titleEl = program.querySelector(".p-title");
		const programName = titleEl ? titleEl.textContent : "";
		const payees = {};

		// Store the program's index position in the container
		const allPrograms = document.querySelectorAll(".program");
		const programIndex = Array.from(allPrograms).indexOf(program);
		originalState.programPositions[programName] = programIndex;
		originalState.programNames.push(programName);

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

	// Remove any programs created during this edit session
	document
		.querySelectorAll('.program[data-new-program="true"]')
		.forEach((p) => p.remove());

	// Restore division-level inputs
	deanInput.value = originalState.dean;
	penInput.value = originalState.pen;
	locInput.value = originalState.loc;
	chairInput.value = originalState.chair;

	// Iterate over saved programs (not just visible ones)
	originalState.programs.forEach((savedProgram) => {
		const programName = savedProgram.programName;
		const safeId = `${programName}-program`;
		let program = document.getElementById(safeId);

		// If card was removed, rebuild it from snapshot data
		if (!program) {
			// Create as fieldset to match the original DOM structure
			const newProgramCard = document.createElement("fieldset");
			newProgramCard.className = "program";
			newProgramCard.id = safeId;
			newProgramCard.style.display = "block";
			// Reset initialization flag so buttons are set up properly
			newProgramCard.dataset.initialized = "false";

			// Build the program card HTML structure to match EJS template exactly
			newProgramCard.innerHTML = `
				<p class="p-title">${escapeHtml(savedProgram.programName)}</p>

				<section class="payee-container program-sections">
					<!-- Payees will be inserted here -->
					<button type="button" class="add-payee-btn" disabled>Add Payee</button>
				</section>

				<fieldset class="program-money-section">
					<div>
						<label>Has been paid</label>
						<input type="checkbox" ${savedProgram.hasBeenPaid ? "checked" : ""} disabled>
					</div>
					<div>
						<label>Submitted</label>
						<input type="checkbox" ${
							savedProgram.reportSubmitted ? "checked" : ""
						} disabled>
					</div>
				</fieldset>

				<fieldset class="program-notes-section">
					<label>Notes</label>
					<textarea disabled>${escapeHtml(savedProgram.notes || "")}</textarea>
				</fieldset>

				<button type="button" class="remove-program-btn" disabled>Remove</button>
			`;

			// Insert the rebuilt card back into the DOM at its original position
			const container = document.getElementById("programs-container");
			const originalPosition = originalState.programPositions[programName];

			if (container) {
				const allPrograms = Array.from(container.querySelectorAll(".program"));

				// If we have a valid position and there's a program at that index, insert before it
				if (originalPosition !== undefined && allPrograms[originalPosition]) {
					container.insertBefore(newProgramCard, allPrograms[originalPosition]);
				} else {
					// Otherwise append to end
					container.appendChild(newProgramCard);
				}

				console.log(
					"Rebuilt program card:",
					newProgramCard.id,
					"at position:",
					originalPosition
				);
			} else {
				console.error("Could not find programs container");
			}

			// Set program reference to the newly rebuilt card for subsequent restoration
			program = newProgramCard;

			// Initialize the card's buttons now that it's in the DOM
			setupProgramButtons(newProgramCard);
		}

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
					<button type="button" class="remove-payee-btn" disabled style="${
						Object.keys(savedProgram.payees).length ? "" : "display:none"
					}">Remove</button>
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
	// Query current DOM to get all programs including any rebuilt ones
	const currentPrograms = document.querySelectorAll(".program");
	currentPrograms.forEach((program) => {
		if (program.style.display === "none") return;

		const payeeInputs = program.querySelectorAll(
			".program-payee-input-section input"
		);
		const removePayeeBtns = program.querySelectorAll(".remove-payee-btn");
		const removeProgramBtns = program.querySelectorAll(".remove-program-btn");
		const addBtn = program.querySelector(".add-payee-btn");
		const checkboxes = program.querySelectorAll(
			".program-money-section input[type='checkbox']"
		);
		const notes = program.querySelector("textarea");

		payeeInputs.forEach((i) => (i.disabled = !editable));
		removePayeeBtns.forEach((b) => (b.disabled = !editable));
		removeProgramBtns.forEach((b) => (b.disabled = !editable));
		if (addBtn) addBtn.disabled = !editable;
		checkboxes.forEach((b) => (b.disabled = !editable));
		if (notes) notes.disabled = !editable;
	});
}

/**
 * Gets all currently visible program cards from the DOM.
 * Accounts for programs that may have been added/removed/rebuilt.
 * @returns {NodeList}
 */
function getVisiblePrograms() {
	return document.querySelectorAll(".program:not([style*='display: none'])");
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
	addProgramBtn.style.display = "inline-block";
	returnBtn.style.display = "none";
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
	addProgramBtn.style.display = "none";
	returnBtn.style.display = "inline-block";
});

/**
 * Click handler for the "Show More" button.
 * - Displays all programs; turns into "Show Less" button that hides all programs that are not under review
 * - If in edit mode, ensures newly visible cards are editable
 */
showMoreBtn.addEventListener("click", () => {
	const selectedDivision = divSelector.value;
	const isCurrentlyEditing = editFormBtn.style.display === "none"; // If edit btn is hidden, we're in edit mode

	if (showMoreBtn.value == "false") {
		showProgramCards(selectedDivision, true);
		showMoreBtn.textContent = "Show Less";
		showMoreBtn.value = "true";
		console.log("Switched to Show Less");
	} else {
		showProgramCards(selectedDivision, false);
		showMoreBtn.textContent = "Show More";
		showMoreBtn.value = "false";
		console.log("Switched to Show More");
	}

	// If we're currently in edit mode, apply edit state to the newly revealed cards
	if (isCurrentlyEditing) {
		setFormEditable(true);
	}
});

/**
 * Click handler for the return to homepage button.
 * - Redirects to home page
 */
returnBtn.addEventListener("click", () => {
	restoreOriginalState();
	setFormEditable(false);

	editFormBtn.style.display = "inline-block";
	saveFormBtn.style.display = "none";
	cancelFormBtn.style.display = "none";
	addProgramBtn.style.display = "none";

	window.location.href = "/"; // go to main page
});

/**
 * Click handler for the add program button.
 * - Prompts the user to name the new program
 */
addProgramBtn.addEventListener("click", () => {
	const programName = prompt("Name of the program:");
	if (!programName) return;

	const newProgramCard = document.createElement("fieldset");
	newProgramCard.className = "program";
	newProgramCard.id = `${programName}-program`;
	newProgramCard.style.display = "block";

	newProgramCard.dataset.initialized = "false";
	newProgramCard.dataset.newProgram = "true";

	newProgramCard.innerHTML = `
		<p class="p-title">${escapeHtml(programName)}</p>

		<section class="payee-container program-sections">
			<button type="button" class="add-payee-btn">Add Payee</button>
		</section>

		<fieldset class="program-money-section">
			<div>
				<label>Has been paid</label>
				<input type="checkbox">
			</div>
			<div>
				<label>Submitted</label>
				<input type="checkbox">
			</div>
		</fieldset>

		<fieldset class="program-notes-section">
			<label>Notes</label>
			<textarea></textarea>
		</fieldset>

		<button type="button" class="remove-program-btn">Remove</button>
	`;

	setupProgramButtons(newProgramCard);

	document.getElementById("programs-container").appendChild(newProgramCard);
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
		deletedPrograms: [], // Track programs to delete on server
	};

	// Determine which programs were deleted
	if (originalState && originalState.programNames) {
		const currentProgramNames = Array.from(getVisiblePrograms()).map(
			(p) => p.querySelector(".p-title")?.textContent || ""
		);
		const deletedPrograms = originalState.programNames.filter(
			(name) => !currentProgramNames.includes(name)
		);
		divisionUpdate.deletedPrograms = deletedPrograms;
		console.log("Deleted programs:", deletedPrograms);
	}

	getVisiblePrograms().forEach((program) => {
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

	document
		.querySelectorAll(".program")
		.forEach((program) => (program.style.display = "none"));
}
