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

	const setEditable = (editable) => {
		payeeInputs.forEach((i) => (i.disabled = !editable));
		removeBtns.forEach((b) => (b.disabled = !editable));
		addBtn.disabled = !editable;
		checkboxes.forEach((b) => (b.disabled = !editable));
		notes.disabled = !editable;
	};

	editBtn.disabled = !formEditing;

	editBtn.addEventListener("click", () => {
		editBtn.style.display = "none";
		saveBtn.style.display = "inline-block";
		cancelBtn.style.display = "inline-block";
		setEditable(true);
	});

	cancelBtn.addEventListener("click", () => {
		editBtn.style.display = "inline-block";
		saveBtn.style.display = "none";
		cancelBtn.style.display = "none";
		setEditable(false);

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

	saveBtn.addEventListener("click", () => {
		editBtn.style.display = "inline-block";
		saveBtn.style.display = "none";
		cancelBtn.style.display = "none";
		setEditable(false);
		alert(`Changes saved for ${programCard.id}`);
	});

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

/**
 * ------------------------------
 * SAVE MASTER FORM (FULL UPDATE)
 * ------------------------------
 */
saveFormBtn.addEventListener("click", async () => {
	formEditing = false;

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
		editFormBtn.style.display = "inline-block";
		saveFormBtn.style.display = "none";
		cancelFormBtn.style.display = "none";

		programsArray.forEach((program) => {
			program.querySelector(".program-edit-btn").disabled = true;
		});
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
