<<<<<<< HEAD
// Require server-provided departments when available (injected by edit.ejs),
// otherwise fall back to an empty array. Wrap in object with `departments` key.
const data = {
	departments: window.serverDepartments || [],
};

/* ----------------------------
   Top-level DOM references
   ---------------------------- */
const pForm = {
	ref: document.getElementById("page-form"),

	selectFieldset: {
		ref: document.getElementById("div-select-set"),
		divisionSelector: document.getElementById("division-select"),

		deanRef: document.getElementById("dean-input"),
		deanErrRef: document.getElementById("err-dean"),

		penRef: document.getElementById("pen-input"),
		penErrRef: document.getElementById("err-pen"),

		locRef: document.getElementById("loc-input"),
		locErrRef: document.getElementById("err-loc"),

		chairRef: document.getElementById("chair-input"),
		chairErrRef: document.getElementById("err-chair"),
	},

	programsFieldset: {
		ref: document.getElementById("programs-container"),
	},
};

// The currently selected department object from `data`
let selectedDivision = data.departments[0] || null;

/* ----------------------------
   UI Control Elements (buttons)
   Created once and appended into the contact area
   ---------------------------- */
const contactFields = [
	pForm.selectFieldset.deanRef,
	pForm.selectFieldset.penRef,
	pForm.selectFieldset.locRef,
	pForm.selectFieldset.chairRef,
];

const contactEditBtn = createButton("Edit");
const contactSaveBtn = createButton("Save");
const contactCancelBtn = createButton("Cancel");

pForm.selectFieldset.ref.append(
	contactEditBtn,
	contactSaveBtn,
	contactCancelBtn
);

/* ----------------------------
   Utility / DOM Helpers
   ---------------------------- */
=======
/* ==============================
   FORM DATA
   ============================== */
>>>>>>> 04c0ab20aa4abe10ce33295418532b995fceff24
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
		if (programCard && !prog.underReview) {
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
	const removePayeeBtns = programCard.querySelectorAll(".remove-payee-btn");
	const removeProgramBtns = programCard.querySelectorAll(".remove-program-btn");

	/* ----- Add Payee Button ----- */
	if (addBtn) {
<<<<<<< HEAD
		addBtn.disabled = !enabled;
		addBtn.style.display = enabled ? "inline-block" : "none";
	}
}

function greyOutProgramCard(fieldsetRef) {
	toggleProgramCard(fieldsetRef, false);
}

function enableProgramCard(fieldsetRef) {
	toggleProgramCard(fieldsetRef, true);
}

/* ----------------------------
   Program card rendering
   ---------------------------- */
function createProgramCards(division) {
	const parent = pForm.programsFieldset.ref;
	if (!parent) return;

	clearContainer(parent);

	if (!division) {
		contactEditBtn.style.display = "none";
		return;
	}

	contactEditBtn.style.display = "inline-block";

	division.programList.forEach((program) => {
		const card = buildProgramCard(program);
		parent.appendChild(card);
		greyOutProgramCard(card);
	});
}

function buildProgramCard(program) {
	const fieldset = document.createElement("fieldset");
	fieldset.classList.add("program");
	fieldset.id = `${program.programName
		.toLowerCase()
		.replace(/\s+/g, "-")}-program`;

	// Title
	const title = document.createElement("p");
	title.classList.add("p-title");
	title.textContent = program.programName;
	fieldset.appendChild(title);

	// Payee section
	const payeeSection = createPayeeSection(program);
	fieldset.appendChild(payeeSection);

	// Money/checkboxes
	const moneySection = createMoneySection(program);
	fieldset.appendChild(moneySection);

	// Notes
	const notesSection = createNotesSection(program);
	fieldset.appendChild(notesSection);

	// Buttons
	const buttons = createProgramButtons(
		fieldset,
		program,
		payeeSection,
		notesSection
	);
	fieldset.appendChild(buttons);

	return fieldset;
}

function createPayeeSection(program) {
	const section = document.createElement("section");
	section.classList.add("payee-container", "program-sections");

	const controlDiv = document.createElement("div");
	const addBtn = createButton("Add");
	controlDiv.appendChild(addBtn);
	section.appendChild(controlDiv);

	addBtn.onclick = () => addPayee(section, program.programName, controlDiv);

	// Populate existing payees (guarding for different shapes)
	const payees = program.payees || {};
	Object.entries(payees).forEach(([name, amt]) => {
		// present amount as string in the input; internal model will convert on save
		addPayee(section, program.programName, controlDiv, name, String(amt));
	});

	return section;
}

function createMoneySection(program) {
	const fs = document.createElement("fieldset");
	fs.classList.add("program-money-section");

	// Helper to create a labeled checkbox
	const makeCheckboxRow = (labelText, initialChecked) => {
		const div = document.createElement("div");
		const label = document.createElement("label");
		label.textContent = labelText;
		const input = document.createElement("input");
		input.type = "checkbox";
		input.checked = !!initialChecked;
		div.append(label, input);
		return { div, input };
	};

	const paidRow = makeCheckboxRow("Has been paid", program.hasBeenPaid);
	const submittedRow = makeCheckboxRow("Submitted", program.reportSubmitted);

	fs.appendChild(paidRow.div);
	fs.appendChild(document.createElement("hr"));
	fs.appendChild(submittedRow.div);

	// Store references on the fieldset for later reads (simple local cache)
	fs._paidInput = paidRow.input;
	fs._submittedInput = submittedRow.input;

	return fs;
}

function createNotesSection(program) {
	const fs = document.createElement("fieldset");
	fs.classList.add("program-notes-section");

	const label = document.createElement("label");
	label.textContent = "Notes";

	const textarea = document.createElement("textarea");
	textarea.value = program.notes || "";

	fs.append(label, textarea);
	return fs;
}

function createProgramButtons(fieldsetRef, program, payeeSection, notesField) {
	const container = document.createElement("div");
	container.classList.add("program-buttons");

	const editBtn = createButton("Edit");
	const saveBtn = createButton("Save Program");
	const cancelBtn = createButton("Cancel");

	container.append(editBtn, saveBtn, cancelBtn);

	saveBtn.style.display = "none";
	cancelBtn.style.display = "none";

	editBtn.onclick = () =>
		enterProgramEditMode(
			fieldsetRef,
			program,
			payeeSection,
			notesField,
			editBtn,
			saveBtn,
			cancelBtn
		);

	return container;
}

/* ----------------------------
   Program Edit Mode (capture / restore / save)
   ---------------------------- */
function enterProgramEditMode(
	fieldsetRef,
	program,
	payeeSection,
	notesField,
	editBtn,
	saveBtn,
	cancelBtn
) {
	const originalState = captureProgramState(
		payeeSection,
		notesField,
		fieldsetRef,
		program
	);

	enableProgramCard(fieldsetRef);
	editBtn.style.display = "none";
	saveBtn.style.display = "inline-block";
	cancelBtn.style.display = "inline-block";

	cancelBtn.onclick = () =>
		restoreProgramState(
			originalState,
			fieldsetRef,
			payeeSection,
			notesField,
			program,
			editBtn,
			saveBtn,
			cancelBtn
		);
	saveBtn.onclick = () =>
		saveProgramState(
			payeeSection,
			notesField,
			fieldsetRef,
			program,
			editBtn,
			saveBtn,
			cancelBtn
		);
}

/**
 * Capture the current editable UI state (used when entering edit mode)
 */
function captureProgramState(payeeSection, notesField, fieldsetRef, program) {
	// Capture payees as name -> string (as presented in inputs)
	const payees = Object.fromEntries(
		[...payeeSection.querySelectorAll(".payee-item")].map((item) => {
			const name = item.querySelector("input[type=text]").value;
			const amt = item.querySelector("input[type=number]").value;
			return [name, amt];
		})
	);

	// capture notes
	const notes = notesField.querySelector("textarea").value;

	// capture checkbox states from the money section (assumes single money section exists)
	const paidInput = fieldsetRef.querySelector(
		".program-money-section"
	)?._paidInput;
	const submittedInput = fieldsetRef.querySelector(
		".program-money-section"
	)?._submittedInput;

	return {
		notes,
		payees,
		hasBeenPaid: paidInput ? paidInput.checked : !!program.hasBeenPaid,
		reportSubmitted: submittedInput
			? submittedInput.checked
			: !!program.reportSubmitted,
	};
}

function restoreProgramState(
	state,
	fieldsetRef,
	payeeSection,
	notesField,
	program,
	editBtn,
	saveBtn,
	cancelBtn
) {
	// Restore notes
	notesField.querySelector("textarea").value = state.notes;

	// Remove current payees then re-add preserved ones
	payeeSection.querySelectorAll(".payee-item").forEach((el) => el.remove());
	const controlDiv = payeeSection.querySelector("div");
	Object.entries(state.payees).forEach(([name, amt]) => {
		addPayee(payeeSection, program.programName, controlDiv, name, amt);
	});

	// Restore checkbox values into the program object (so display matches underlying data)
	program.hasBeenPaid = state.hasBeenPaid;
	program.reportSubmitted = state.reportSubmitted;

	greyOutProgramCard(fieldsetRef);
	editBtn.style.display = "inline-block";
	saveBtn.style.display = "none";
	cancelBtn.style.display = "none";
}

/**
 * Save edited program fields back into the program object.
 * IMPORTANT: payee amounts are converted to numbers here (Option 2 chosen).
 */
function saveProgramState(
	payeeSection,
	notesField,
	fieldsetRef,
	program,
	editBtn,
	saveBtn,
	cancelBtn
) {
	// Notes
	program.notes = notesField.querySelector("textarea").value;

	// Payees: convert amounts to numbers (fallback to 0 if invalid)
	const newPayees = {};
	let hasValidationError = false;
	payeeSection.querySelectorAll(".payee-item").forEach((item) => {
		const nameInput = item.querySelector("input[type=text]");
		const amountInput = item.querySelector("input[type=number]");

		const name = nameInput.value.trim();
		const amtRaw = amountInput.value.trim();

		// Case 1: Both empty → remove the row
		if (name === "" && amtRaw === "") {
			item.remove();
			return;
		}

		// Case 2: name is missing
		if (name === "") {
			hasValidationError = true;
			nameInput.style.border = name === "" ? "1px solid red" : "";

			// Reset border when user clicks the input
			nameInput.onclick = () => {
				nameInput.style.border = "";
			};
		}

		if (amtRaw === "") {
			hasValidationError = true;
			console.log(amtRaw === "");
			amountInput.style.border = amtRaw === "" ? "1px solid red" : "";
			amountInput.onclick = () => {
				amountInput.style.border = "";
			};
			console.log(1);
		}

		// Exit if there is an error
		if (hasValidationError) {
			return;
		}

		// Case 3: Both present → convert amount to number
		const amt = Number.parseFloat(amtRaw);
		newPayees[name] = Number.isFinite(amt) ? amt : 0;
	});

	// Stop save if validation failed
	if (hasValidationError) {
		return; // stay in edit mode
	}

	program.payees = newPayees;

	// Checkboxes
	const moneySection = fieldsetRef.querySelector(".program-money-section");
	if (moneySection) {
		const paidInput = moneySection._paidInput;
		const submittedInput = moneySection._submittedInput;
		if (paidInput) program.hasBeenPaid = paidInput.checked;
		if (submittedInput) program.reportSubmitted = submittedInput.checked;
	}

	// Persist program changes to database
	if (selectedDivision) {
		persistDivisionToDB(selectedDivision);
	}

	// Disable editing and reset button visibility
	greyOutProgramCard(fieldsetRef);
	editBtn.style.display = "inline-block";
	saveBtn.style.display = "none";
	cancelBtn.style.display = "none";

	// Log values for testing
	console.log(data);
}

/* ----------------------------
   Payee helpers
   ---------------------------- */
function addPayee(section, programName, controlDiv, name = "", amount = "") {
	const index = section.querySelectorAll(".payee-item").length + 1;

	const wrapper = document.createElement("div");
	wrapper.classList.add("payee-item");

	const label = document.createElement("label");
	label.htmlFor = `${programName
		.toLowerCase()
		.replace(/\s+/g, "-")}-payee-${index}`;
	label.textContent = `Payee #${index}`;

	const inputRow = document.createElement("div");
	inputRow.classList.add("program-payee-input-section");

	const nameInput = document.createElement("input");
	nameInput.type = "text";
	nameInput.id = `${programName
		.toLowerCase()
		.replace(/\s+/g, "-")}-payee-${index}`;
	nameInput.value = name;

	const amountInput = document.createElement("input");
	amountInput.type = "number";
	amountInput.id = `${programName
		.toLowerCase()
		.replace(/\s+/g, "-")}-payee-${index}-money`;
	amountInput.value = amount;
	amountInput.placeholder = "$";
	amountInput.step = "0.01";

	const removeBtn = createButton("Remove");
	removeBtn.classList.add("remove-payee-btn");
	removeBtn.onclick = () => {
		wrapper.remove();
		updatePayeeNumbers(section);
	};

	inputRow.append(nameInput, amountInput, removeBtn);
	wrapper.append(label, inputRow);

	section.insertBefore(wrapper, controlDiv);
}

function updatePayeeNumbers(section) {
	section.querySelectorAll(".payee-item").forEach((div, i) => {
		const label = div.querySelector("label");
		if (label) label.textContent = `Payee #${i + 1}`;
		// keep input ids in sync (optional)
		const nameInput = div.querySelector("input[type=text]");
		const moneyInput = div.querySelector("input[type=number]");
		if (nameInput)
			nameInput.id = nameInput.id.replace(/-payee-\d+/, `-payee-${i + 1}`);
		if (moneyInput)
			moneyInput.id = moneyInput.id.replace(
				/-payee-\d+-money/,
				`-payee-${i + 1}-money`
			);
	});
}

/* ----------------------------
   Contact info edit/save/restore
   ---------------------------- */
contactEditBtn.onclick = () => {
	const snapshot = captureContactState();
	setEnabled(contactFields, true);

	contactEditBtn.style.display = "none";
	contactSaveBtn.style.display = "inline-block";
	contactCancelBtn.style.display = "inline-block";

	contactCancelBtn.onclick = () => restoreContactState(snapshot);
	contactSaveBtn.onclick = () => saveContactState();
};

function captureContactState() {
	return {
		dean: pForm.selectFieldset.deanRef.value,
		pen: pForm.selectFieldset.penRef.value,
		loc: pForm.selectFieldset.locRef.value,
		chair: pForm.selectFieldset.chairRef.value,
	};
}

function restoreContactState(state) {
	// put the snapshot back into the selectedDivision and update UI
	if (!selectedDivision) return;

	// Clear validation borders (VERY IMPORTANT)
	const inputs = [
		pForm.selectFieldset.deanRef,
		pForm.selectFieldset.penRef,
		pForm.selectFieldset.locRef,
		pForm.selectFieldset.chairRef,
	];

	inputs.forEach((input) => {
		input.style.border = ""; // reset border
	});

	// Restore saved state
	selectedDivision.deanName = state.dean;
	selectedDivision.penContact = state.pen;
	selectedDivision.locRep = state.loc;
	selectedDivision.chairName = state.chair;

	// Update UI and lock fields
	updateContactInfo(selectedDivision.divisionName);
	greyOutContactInfo();

	// Log values for testing
	console.log(data);
}

function saveContactState() {
	if (!selectedDivision) return;

	// Track validation status
	let hasError = false;

	// List of required textboxes
	const requiredFields = [
		pForm.selectFieldset.deanRef,
		pForm.selectFieldset.penRef,
		pForm.selectFieldset.locRef,
		pForm.selectFieldset.chairRef,
	];

	requiredFields.forEach((input) => {
		const value = input.value.trim();

		// If empty → highlight
		if (value === "") {
			hasError = true;
			input.style.border = "2px solid red";

			// Remove border once user interacts again
			input.addEventListener(
				"input",
				() => {
					input.style.border = "";
				},
				{ once: true }
			);
		}
	});

	// Stop save if invalid
	if (hasError) {
		return;
	}

	// Save values if all good
	selectedDivision.deanName = pForm.selectFieldset.deanRef.value.trim();
	selectedDivision.penContact = pForm.selectFieldset.penRef.value.trim();
	selectedDivision.locRep = pForm.selectFieldset.locRef.value.trim();
	selectedDivision.chairName = pForm.selectFieldset.chairRef.value.trim();

	// Persist to database via API
	persistDivisionToDB(selectedDivision);

	// Lock UI
	greyOutContactInfo();

	// Debug output
	console.log(data);
}

function updateContactInfo(name) {
	if (!name) {
		setEnabled(contactFields, false);
		contactFields.forEach((el) => (el.value = ""));
		selectedDivision = null;
		return;
	}

	const dept = data.departments.find((d) => d.divisionName === name);
	if (!dept) return;

	selectedDivision = dept;

	pForm.selectFieldset.deanRef.value = dept.deanName || "";
	pForm.selectFieldset.penRef.value = dept.penContact || "";
	pForm.selectFieldset.locRef.value = dept.locRep || "";
	pForm.selectFieldset.chairRef.value = dept.chairName || "";

	setEnabled(contactFields, false);
}

function updateProgramCards(name) {
	const dept = data.departments.find((d) => d.divisionName === name);
	createProgramCards(dept);
}

/**
 * Persist division and program data to the server
 */
async function persistDivisionToDB(division) {
	try {
		const response = await fetch("/api/save-division", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(division),
		});

		const result = await response.json();
		if (!response.ok) {
			console.error("Failed to save division:", result.error);
			alert("Error saving data: " + (result.error || "Unknown error"));
			return false;
		}

		console.log("Division saved successfully:", result);
		return true;
	} catch (error) {
		console.error("Error persisting division to DB:", error);
		alert("Error saving data: " + error.message);
		return false;
	}
}

/* ----------------------------
   Initialization
   ---------------------------- */
(function init() {
	fillDivisionSelector();
	clearContainer(pForm.programsFieldset.ref);
	greyOutContactInfo();

	// Wire change event for division selector
	const selector = pForm.selectFieldset.divisionSelector;
	if (selector) {
		selector.addEventListener("change", function () {
			updateContactInfo(this.value);
			updateProgramCards(this.value);
=======
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
>>>>>>> 04c0ab20aa4abe10ce33295418532b995fceff24
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

	document
		.querySelectorAll(".program")
		.forEach((program) => (program.style.display = "none"));
}
