export class Program {
	constructor(
		programName = "",
		payees = {},
		hasBeenPaid = false,
		dateOfPayment = new Date(),
		reportSubmitted = false,
		notes = ""
	) {
		this.programName = programName;
		this.payees = payees;
		this.hasBeenPaid = hasBeenPaid;
		this.dateOfPayment = dateOfPayment;
		this.reportSubmitted = reportSubmitted;
		this.notes = notes;
	}

	// Getters
	getProgramName() {
		return this.programName;
	}

	getPayees() {
		return this.payees;
	}

	getHasBeenPaid() {
		return this.hasBeenPaid;
	}

	getDateOfPayment() {
		return this.dateOfPayment;
	}

	getReportSubmitted() {
		return this.reportSubmitted;
	}

	getNotes() {
		return this.notes;
	}

	// Setters
	setProgramName(programName) {
		this.programName = programName;
	}

	setPayees(payees) {
		this.payees = payees;
	}

	setHasBeenPaid(hasBeenPaid) {
		this.hasBeenPaid = hasBeenPaid;
	}

	setDateOfPayment(dateOfPayment) {
		this.dateOfPayment = dateOfPayment;
	}

	setReportSubmitted(reportSubmitted) {
		this.reportSubmitted = reportSubmitted;
	}

	setNotes(notes) {
		this.notes = notes;
	}
}
