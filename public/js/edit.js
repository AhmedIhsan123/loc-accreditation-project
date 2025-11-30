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
const addProgramBtn = document.getElementById("add-program-btn");
const returnBtn = document.getElementById("return-btn");

// Modal references
const moveProgramModal = document.getElementById("move-program-modal");
const moveProgramNameEl = document.getElementById("move-program-name");
const targetDivisionSelect = document.getElementById("target-division-select");
const moveModalClose = document.getElementById("move-modal-close");
const moveModalBackdrop = document.getElementById("move-modal-backdrop");
const moveModalCancel = document.getElementById("move-modal-cancel");
const moveModalConfirm = document.getElementById("move-modal-confirm");

let currentProgramToMove = null; // Track which program is being moved

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
	const moveProgramBtns = programCard.querySelectorAll(".move-program-btn");
	const programTitle = programCard.querySelector(".p-title");

	/* ----- Editable Program Title ----- */
	if (programTitle) {
		// Store original name as a data attribute for reference
		if (!programTitle.dataset.originalName) {
			programTitle.dataset.originalName = programTitle.textContent.replace(/→.*$/, "").trim();
		}

		programTitle.addEventListener("click", () => {
			// Only allow editing if the form is in edit mode
			const isEditable = !addBtn?.disabled;
			if (!isEditable) return;

			// Get current name (strip move badge if present)
			const currentName = programTitle.textContent.replace(/→.*$/, "").trim();
			
			// Prompt for new name
			const newName = prompt("Enter new program name:", currentName);
			
			// Validate input
			if (!newName || newName.trim() === "") {
				alert("Program name cannot be empty.");
				return;
			}
			
			if (newName.trim() === currentName) {
				return; // No change
			}

			// Check for duplicate names in the current division
			const allVisiblePrograms = getVisiblePrograms();
			const duplicateExists = Array.from(allVisiblePrograms).some(prog => {
				if (prog === programCard) return false; // Skip self
				const existingName = prog.querySelector(".p-title")?.textContent.replace(/→.*$/, "").trim();
				return existingName === newName.trim();
			});

			if (duplicateExists) {
				alert(`A program named "${newName}" already exists in this division.`);
				return;
			}

			// Update the program name
			const moveBadge = programTitle.querySelector(".move-badge");
			if (moveBadge) {
				// Preserve move badge
				programTitle.textContent = newName.trim();
				programTitle.appendChild(moveBadge);
			} else {
				programTitle.textContent = newName.trim();
			}

			// Update the card ID to match new name
			programCard.id = `${newName.trim()}-program`;

			// Mark that this program has been renamed
			programCard.dataset.renamedProgram = "true";
			programCard.dataset.oldProgramName = currentName;

			console.log(`Renamed program from "${currentName}" to "${newName.trim()}"`);
		});

		// Add visual feedback that title is clickable when in edit mode
		programTitle.style.cursor = "pointer";
		programTitle.title = "Click to rename program";
	}

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

	/* ----- Existing Move Program Buttons ----- */
	moveProgramBtns.forEach((btn) => {
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			const programElem = e.target.closest(".program") || programCard;
			if (programElem) {
				openMoveModal(programElem);
			}
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

	// Remove all move badges and clear move-related data attributes
	document.querySelectorAll('.program').forEach((program) => {
		const moveBadge = program.querySelector(".move-badge");
		if (moveBadge) {
			moveBadge.remove();
		}
		
		// Clear move-related data attributes
		if (program.dataset.targetDivision) {
			delete program.dataset.targetDivision;
		}
		if (program.dataset.movedProgram) {
			delete program.dataset.movedProgram;
		}
		
		// Clear rename-related data attributes
		if (program.dataset.renamedProgram) {
			delete program.dataset.renamedProgram;
		}
		if (program.dataset.oldProgramName) {
			delete program.dataset.oldProgramName;
		}
	});

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
		const moveProgramBtns = program.querySelectorAll(".move-program-btn");
		const checkboxes = program.querySelectorAll(
			".program-money-section input[type='checkbox']"
		);
		const notes = program.querySelector("textarea");

		payeeInputs.forEach((i) => (i.disabled = !editable));
		removePayeeBtns.forEach((b) => (b.disabled = !editable));
		removeProgramBtns.forEach((b) => (b.disabled = !editable));
		moveProgramBtns.forEach((b) => (b.disabled = !editable));
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
	returnBtn.style.display = "inline-block";
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
	returnBtn.style.display = "none";
});

/**
 * Click handler for the "Show More" button.
 * - Displays all programs; turns into "Show Less" button that hides all programs that are not under review
 */
showMoreBtn.addEventListener("click", () => {
	const selectedDivision = divSelector.value;

	if (showMoreBtn.value == "false") {
		showProgramCards(selectedDivision, true);
		showMoreBtn.textContent = "Show Less";
		showMoreBtn.value = "true";
		console.log("Switched to Show Less")
	} else {
		showProgramCards(selectedDivision, false);
		showMoreBtn.textContent = "Show More";
		showMoreBtn.value = "false";
		console.log("Switched to Show More")
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
		<button type="button" class="move-program-btn">Move to...</button>
	`;

	setupProgramButtons(newProgramCard);

	document.getElementById("programs-container").appendChild(newProgramCard);
});

/* ==============================
   MOVE PROGRAM MODAL FUNCTIONS
   ============================== */
/**
 * Opens the move program modal and populates division options
 * @param {HTMLElement} programCard - The program card being moved
 */
function openMoveModal(programCard) {
	const currentDivision = divSelector.value;
	const programTitle = programCard.querySelector(".p-title")?.textContent || "Program";
	
	// Store reference to program being moved
	currentProgramToMove = programCard;
	
	// Update modal title
	moveProgramNameEl.textContent = `Moving: ${programTitle}`;
	
	// Clear and populate target division dropdown
	targetDivisionSelect.innerHTML = '<option value="">-- Select division --</option>';
	
	// Add all divisions except the current one
	data.departments.forEach(dept => {
		if (dept.divisionName !== currentDivision) {
			const option = document.createElement("option");
			option.value = dept.divisionName;
			option.textContent = dept.divisionName;
			targetDivisionSelect.appendChild(option);
		}
	});
	
	// Show modal
	moveProgramModal.style.display = "block";
}

/**
 * Closes the move program modal and resets state
 */
function closeMoveModal() {
	moveProgramModal.style.display = "none";
	targetDivisionSelect.value = "";
	currentProgramToMove = null;
}

/**
 * Handles the program move confirmation
 */
function confirmProgramMove() {
	const targetDivision = targetDivisionSelect.value;
	
	if (!targetDivision) {
		alert("Please select a target division.");
		return;
	}
	
	if (!currentProgramToMove) {
		alert("No program selected to move.");
		return;
	}
	
	const programTitle = currentProgramToMove.querySelector(".p-title")?.textContent || "";
	
	// Mark the program with the target division for the save operation
	currentProgramToMove.dataset.targetDivision = targetDivision;
	currentProgramToMove.dataset.movedProgram = "true";
	
	// Visual feedback - add a badge or indicator
	const existingBadge = currentProgramToMove.querySelector(".move-badge");
	if (existingBadge) {
		existingBadge.remove();
	}
	
	const moveBadge = document.createElement("span");
	moveBadge.className = "move-badge";
	moveBadge.textContent = `→ Moving to ${targetDivision}`;
	moveBadge.style.cssText = "display:inline-block;margin-left:10px;padding:4px 8px;background:#ffc107;color:#000;border-radius:4px;font-size:12px;font-weight:600;";
	
	const titleEl = currentProgramToMove.querySelector(".p-title");
	if (titleEl) {
		titleEl.appendChild(moveBadge);
	}
	
	alert(`Program "${programTitle}" will be moved to "${targetDivision}" when you save.`);
	closeMoveModal();
}

/* ==============================
   MODAL EVENT LISTENERS
   ============================== */
moveModalClose.addEventListener("click", closeMoveModal);
moveModalBackdrop.addEventListener("click", closeMoveModal);
moveModalCancel.addEventListener("click", closeMoveModal);
moveModalConfirm.addEventListener("click", confirmProgramMove);

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
	if (e.key === "Escape" && moveProgramModal.style.display === "block") {
		closeMoveModal();
	}
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
		deletedPrograms: [],
		movedPrograms: [],
		renamedPrograms: [], // Track programs that were renamed
	};

	// Determine which programs were deleted
	if (originalState && originalState.programNames) {
		const currentProgramNames = Array.from(getVisiblePrograms()).map(
			(p) => p.querySelector(".p-title")?.textContent.replace(/→.*$/, "").trim() || ""
		);
		
		// Include old names of renamed programs in the list of "current" programs
		const renamedOldNames = Array.from(getVisiblePrograms())
			.filter(p => p.dataset.renamedProgram === "true")
			.map(p => p.dataset.oldProgramName);
		
		const allCurrentNames = [...currentProgramNames, ...renamedOldNames];
		
		const deletedPrograms = originalState.programNames.filter(
			(name) => !allCurrentNames.includes(name)
		);
		divisionUpdate.deletedPrograms = deletedPrograms;
		console.log("Deleted programs:", deletedPrograms);
	}

	getVisiblePrograms().forEach((program) => {
		const titleEl = program.querySelector(".p-title");
		const programName = titleEl ? titleEl.textContent.replace(/→.*$/, "").trim() : "";
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

		const programData = {
			programName,
			hasBeenPaid: !!(checkboxes[0] && checkboxes[0].checked),
			reportSubmitted: !!(checkboxes[1] && checkboxes[1].checked),
			notes,
			payees,
		};

		// Check if this program was renamed
		if (program.dataset.renamedProgram === "true" && program.dataset.oldProgramName) {
			programData.oldProgramName = program.dataset.oldProgramName;
			divisionUpdate.renamedPrograms.push(programData);
		}
		// Check if this program is marked for moving
		else if (program.dataset.movedProgram === "true" && program.dataset.targetDivision) {
			divisionUpdate.movedPrograms.push({
				...programData,
				targetDivision: program.dataset.targetDivision
			});
		} else {
			divisionUpdate.programs.push(programData);
		}
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

		// Reload to reflect server-side changes
		window.location.reload();
	} catch (err) {
		console.error(err);
		alert("Error saving changes.");
	}

	window.location.href = "/";
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
