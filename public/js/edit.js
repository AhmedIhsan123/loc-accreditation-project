/**
 * ------------------------------
 * FORM DATA
 * ------------------------------
 * Holds server-provided departments data.
 */
const data = { departments: window.serverDepartments || [] };

/**
 * Store original state when entering edit mode
 */
let originalState = null;

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
 * ------------------------------
 * DIVISION SELECTION HANDLER
 * ------------------------------
 */
divSelector.addEventListener("change", () => {
	const selectedDivision = divSelector.value;

	if (!selectedDivision) {
		resetDivisionForm();
		return;
	}

	editFormBtn.style.display = "inline-block";
	showProgramCards(selectedDivision);

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
 */
function showProgramCards(divisionName) {
	programsArray.forEach((program) => (program.style.display = "none"));

	const division = data.departments.find(
		(d) => d.divisionName === divisionName
	);
	if (!division || !division.programList) return;

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
 */
function setupProgramButtons(programCard) {
	// Check if already initialized
	if (programCard.dataset.initialized === "true") return;
	programCard.dataset.initialized = "true";

	const addBtn = programCard.querySelector(".add-payee-btn");
	const removeBtns = programCard.querySelectorAll(".remove-payee-btn");

	// Setup add payee button
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

	// Setup existing remove buttons
	removeBtns.forEach((btn) => {
		btn.addEventListener("click", (e) => {
			const parent = e.target.closest(".payee-item");
			parent.remove();
			const payeeContainer = programCard.querySelector(".payee-container");
			updatePayeeLabels(payeeContainer);
		});
	});
}

function updatePayeeLabels(container) {
	const allPayees = container.querySelectorAll(".payee-item");
	allPayees.forEach(
		(p, i) => (p.querySelector("label").textContent = `Payee #${i + 1}`)
	);
}

/**
 * ------------------------------
 * SAVE CURRENT STATE
 * ------------------------------
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
		if (program.style.display !== "none") {
			const programName = program.querySelector(".p-title").textContent;

			const payees = {};
			program.querySelectorAll(".payee-item").forEach((item) => {
				const name = item.querySelector("input[type='text']").value.trim();
				const amount = item.querySelector("input[type='number']").value;
				if (name) payees[name] = amount;
			});

			const checkboxes = program.querySelectorAll(
				".program-money-section input[type='checkbox']"
			);
			const notes = program.querySelector("textarea").value;

			originalState.programs.push({
				programName,
				hasBeenPaid: checkboxes[0].checked,
				reportSubmitted: checkboxes[1].checked,
				notes,
				payees,
			});
		}
	});
}

/**
 * ------------------------------
 * RESTORE ORIGINAL STATE
 * ------------------------------
 */
function restoreOriginalState() {
	if (!originalState) return;

	// Restore division-level inputs
	deanInput.value = originalState.dean;
	penInput.value = originalState.pen;
	locInput.value = originalState.loc;
	chairInput.value = originalState.chair;

	// Restore each program
	programsArray.forEach((program) => {
		if (program.style.display !== "none") {
			const programName = program.querySelector(".p-title").textContent;
			const savedProgram = originalState.programs.find(
				(p) => p.programName === programName
			);

			if (!savedProgram) return;

			// Restore checkboxes
			const checkboxes = program.querySelectorAll(
				".program-money-section input[type='checkbox']"
			);
			checkboxes[0].checked = savedProgram.hasBeenPaid;
			checkboxes[1].checked = savedProgram.reportSubmitted;

			// Restore notes
			const notes = program.querySelector("textarea");
			notes.value = savedProgram.notes;

			// Restore payees
			const payeeContainer = program.querySelector(".payee-container");
			const addBtn = payeeContainer.querySelector(".add-payee-btn");

			// Remove all existing payee items
			const existingPayees = payeeContainer.querySelectorAll(".payee-item");
			existingPayees.forEach((item) => item.remove());

			// Add back original payees
			let payeeIndex = 1;
			for (const [name, amount] of Object.entries(savedProgram.payees)) {
				const newDiv = document.createElement("div");
				newDiv.className = "payee-item";
				newDiv.innerHTML = `
					<label>Payee #${payeeIndex}</label>
					<div class="program-payee-input-section grid">
						<input type="text" value="${name}" disabled>
						<input type="number" value="${amount}" disabled>
						<button type="button" class="remove-payee-btn" disabled>Remove</button>
					</div>
				`;
				payeeContainer.insertBefore(newDiv, addBtn);
				payeeIndex++;
			}
		}
	});

	originalState = null;
}

/**
 * ------------------------------
 * SET FORM EDITABLE STATE
 * ------------------------------
 */
function setFormEditable(editable) {
	// Division-level inputs
	deanInput.disabled = !editable;
	penInput.disabled = !editable;
	locInput.disabled = !editable;
	chairInput.disabled = !editable;

	// All visible programs
	programsArray.forEach((program) => {
		if (program.style.display !== "none") {
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
			addBtn.disabled = !editable;
			checkboxes.forEach((b) => (b.disabled = !editable));
			notes.disabled = !editable;
		}
	});
}

/**
 * ------------------------------
 * MASTER FORM BUTTONS
 * ------------------------------
 */
editFormBtn.addEventListener("click", () => {
	saveCurrentState();
	setFormEditable(true);

	editFormBtn.style.display = "none";
	saveFormBtn.style.display = "inline-block";
	cancelFormBtn.style.display = "inline-block";
});

cancelFormBtn.addEventListener("click", () => {
	restoreOriginalState();
	setFormEditable(false);

	editFormBtn.style.display = "inline-block";
	saveFormBtn.style.display = "none";
	cancelFormBtn.style.display = "none";
});

/**
 * ------------------------------
 * SAVE MASTER FORM (FULL UPDATE)
 * ------------------------------
 */
saveFormBtn.addEventListener("click", async () => {
	const divisionName = divSelector.value;
	if (!divisionName) return alert("Please select a division.");

	const divisionUpdate = {
		divisionName,
		dean: deanInput.value.trim(),
		pen: penInput.value.trim(),
		loc: locInput.value.trim(),
		chair: chairInput.value.trim(),
		programs: [],
	};

	programsArray.forEach((program) => {
		if (program.style.display !== "none") {
			const programName = program.querySelector(".p-title").textContent;

			const payees = {};
			program.querySelectorAll(".payee-item").forEach((item) => {
				const name = item.querySelector("input[type='text']").value.trim();
				const amount = parseFloat(
					item.querySelector("input[type='number']").value
				);
				if (name) payees[name] = amount;
			});

			const checkboxes = program.querySelectorAll(
				".program-money-section input[type='checkbox']"
			);

			const notes = program.querySelector("textarea").value.trim();

			divisionUpdate.programs.push({
				programName,
				hasBeenPaid: checkboxes[0].checked,
				reportSubmitted: checkboxes[1].checked,
				notes,
				payees,
			});
		}
	});

	try {
		const res = await fetch("/api/division/full-update", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(divisionUpdate),
		});
		if (!res.ok) throw new Error("Failed to save");

		alert("Changes saved successfully!");

		// Reset the form state
		setFormEditable(false);
		editFormBtn.style.display = "inline-block";
		saveFormBtn.style.display = "none";
		cancelFormBtn.style.display = "none";
		originalState = null;

		// Reload the page to get fresh data from server
		window.location.reload();
	} catch (err) {
		console.error(err);
		alert("Error saving changes.");
	}
});

/**
 * ------------------------------
 * HELPER: RESET DIVISION FORM
 * ------------------------------
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
