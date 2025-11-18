/**
 * ------------------------------
 * FORM DATA
 * ------------------------------
 * Holds server-provided departments data.
 */
const data = { departments: window.serverDepartments || [] };

/**
 * ------------------------------
 * DOM REFERENCES
 * ------------------------------
 */
const divSelector = document.getElementById("division-select");
const programsArray = document.querySelectorAll(".program");

const deanInput = document.getElementById("dean-input");
const penInput = document.getElementById("pen-input");
const locInput = document.getElementById("loc-input");
const chairInput = document.getElementById("chair-input");

const editFormBtn = document.getElementById("edit-form-btn");
const saveFormBtn = document.getElementById("save-form-btn");
const cancelFormBtn = document.getElementById("cancel-form-btn");

/**
 * Tracks whether the master form is in editing mode
 * @type {boolean}
 */
let formEditing = false;

/**
 * ------------------------------
 * DIVISION SELECTION HANDLER
 * ------------------------------
 * Handles user selecting a division from the dropdown.
 */
divSelector.addEventListener("change", () => {
	const selectedDivision = divSelector.value;

	// If default option is selected, hide everything and clear inputs
	if (!selectedDivision) {
		resetDivisionForm();
		return;
	}

	// Show edit form button for selected division
	editFormBtn.style.display = "inline-block";

	// Show program cards for the selected division
	showProgramCards(selectedDivision);

	// Populate dean, PEN, LOC, and chair inputs from dataset
	const option = divSelector.selectedOptions[0];
	deanInput.value = option.dataset.dean || "";
	penInput.value = option.dataset.pen || "";
	locInput.value = option.dataset.loc || "";
	chairInput.value = option.dataset.chair || "";
});

/**
 * ------------------------------
 * SHOW PROGRAM CARDS
 * ------------------------------
 * Displays the program cards for the selected division.
 * @param {string} divisionName - Name of the selected division
 */
function showProgramCards(divisionName) {
	// Hide all program cards first
	programsArray.forEach((program) => (program.style.display = "none"));

	// Find division data
	const division = data.departments.find(
		(d) => d.divisionName === divisionName
	);
	if (!division || !division.programList) return;

	// Show program cards and setup buttons
	division.programList.forEach((prog) => {
		const programCard = document.getElementById(`${prog.programName}-program`);
		if (programCard) {
			programCard.style.display = "block";
			setupProgramButtons(programCard);
		}
	});
}

/**
 * ------------------------------
 * SETUP PROGRAM BUTTONS
 * ------------------------------
 * Enables editing, saving, cancelling, and payee management for a program card.
 * @param {HTMLElement} programCard - The program card element
 */
function setupProgramButtons(programCard) {
	const editBtn = programCard.querySelector(".program-edit-btn");
	const saveBtn = programCard.querySelector(".program-save-btn");
	const cancelBtn = programCard.querySelector(".program-cancel-btn");

	const payeeInputs = programCard.querySelectorAll(
		".program-payee-input-section input"
	);
	const removeBtns = programCard.querySelectorAll(".remove-payee-btn");
	const addBtn = programCard.querySelector(".add-payee-btn");
	const checkboxes = programCard.querySelectorAll(
		".program-money-section input[type='checkbox']"
	);
	const notes = programCard.querySelector("textarea");

	/**
	 * Enable or disable inputs on the program card
	 * @param {boolean} editable
	 */
	const setEditable = (editable) => {
		payeeInputs.forEach((i) => (i.disabled = !editable));
		removeBtns.forEach((b) => (b.disabled = !editable));
		addBtn.disabled = !editable;
		checkboxes.forEach((b) => (b.disabled = !editable));
		notes.disabled = !editable;
	};

	// Disable edit button initially unless master form is in edit mode
	editBtn.disabled = !formEditing;

	/** ------------------------------
	 * EDIT PROGRAM BUTTON
	 * ------------------------------ */
	editBtn.addEventListener("click", () => {
		editBtn.style.display = "none";
		saveBtn.style.display = "inline-block";
		cancelBtn.style.display = "inline-block";
		setEditable(true);
	});

	/** ------------------------------
	 * CANCEL PROGRAM BUTTON
	 * ------------------------------ */
	cancelBtn.addEventListener("click", () => {
		editBtn.style.display = "inline-block";
		saveBtn.style.display = "none";
		cancelBtn.style.display = "none";
		setEditable(false);

		// Restore original program data
		const division = data.departments.find((d) =>
			d.programList.some((p) => `${p.programName}-program` === programCard.id)
		);
		const prog = division.programList.find(
			(p) => `${p.programName}-program` === programCard.id
		);

		const inputs = programCard.querySelectorAll(
			".program-payee-input-section input[type='text']"
		);
		const moneyInputs = programCard.querySelectorAll(
			".program-payee-input-section input[type='number']"
		);
		const removeBtnsLocal = programCard.querySelectorAll(".remove-payee-btn");

		let idx = 0;
		for (const [name, amount] of Object.entries(prog.payees)) {
			inputs[idx].value = name;
			moneyInputs[idx].value = amount;
			removeBtnsLocal[idx].style.display = "inline-block";
			idx++;
		}
		for (; idx < removeBtnsLocal.length; idx++)
			removeBtnsLocal[idx].style.display = "none";

		checkboxes[0].checked = prog.hasBeenPaid;
		checkboxes[1].checked = prog.reportSubmitted;
		notes.value = prog.notes;
	});

	/** ------------------------------
	 * SAVE PROGRAM BUTTON
	 * ------------------------------ */
	saveBtn.addEventListener("click", () => {
		editBtn.style.display = "inline-block";
		saveBtn.style.display = "none";
		cancelBtn.style.display = "none";
		setEditable(false);

		alert(`Changes saved for ${programCard.id}`);
	});

	/** ------------------------------
	 * ADD PAYEE BUTTON
	 * ------------------------------ */
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

		const removeBtn = newDiv.querySelector(".remove-payee-btn");
		removeBtn.addEventListener("click", () => {
			newDiv.remove();
			updatePayeeLabels(payeeContainer);
		});
	});

	/** ------------------------------
	 * REMOVE EXISTING PAYEE BUTTONS
	 * ------------------------------ */
	removeBtns.forEach((btn) => {
		btn.addEventListener("click", (e) => {
			const parent = e.target.closest(".payee-item");
			parent.remove();
			const payeeContainer = programCard.querySelector(".payee-container");
			updatePayeeLabels(payeeContainer);
		});
	});
}

/**
 * Updates payee labels to keep numbering sequential
 * @param {HTMLElement} container
 */
function updatePayeeLabels(container) {
	const allPayees = container.querySelectorAll(".payee-item");
	allPayees.forEach(
		(p, i) => (p.querySelector("label").textContent = `Payee #${i + 1}`)
	);
}

/**
 * ------------------------------
 * MASTER FORM BUTTONS
 * ------------------------------
 */
editFormBtn.addEventListener("click", () => {
	formEditing = true;
	editFormBtn.style.display = "none";
	saveFormBtn.style.display = "inline-block";
	cancelFormBtn.style.display = "inline-block";

	programsArray.forEach((program) => {
		if (program.style.display !== "none") {
			program.querySelector(".program-edit-btn").disabled = false;
		}
	});
});

cancelFormBtn.addEventListener("click", () => {
	formEditing = false;
	editFormBtn.style.display = "inline-block";
	saveFormBtn.style.display = "none";
	cancelFormBtn.style.display = "none";

	programsArray.forEach((program) => {
		program.querySelector(".program-edit-btn").disabled = true;
	});
});

saveFormBtn.addEventListener("click", () => {
	formEditing = false;
	editFormBtn.style.display = "inline-block";
	saveFormBtn.style.display = "none";
	cancelFormBtn.style.display = "none";

	programsArray.forEach((program) => {
		program.querySelector(".program-edit-btn").disabled = true;
	});

	alert("All form edits enabled. Individual programs can be edited now.");
});

/**
 * ------------------------------
 * HELPER: RESET DIVISION FORM
 * ------------------------------
 * Clears all inputs, hides all buttons and program cards
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
