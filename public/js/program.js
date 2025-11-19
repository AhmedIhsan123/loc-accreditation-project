export class Program {
	constructor(
		programName = "",
		payees = {},
		hasBeenPaid = false,
		dateOfPayment = new Date(),
		reportSubmitted = false,
		underReview = false,
		notes = ""
	) {
		this.programName = programName;
		this.payees = payees;
		this.hasBeenPaid = hasBeenPaid;
		this.dateOfPayment = dateOfPayment;
		this.reportSubmitted = reportSubmitted;
		this.underReview = underReview;
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

	getUnderReview() {
		return this.underReview;
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

	setUnderReview(underReview) {
		this.underReview = underReview;
	}

	setNotes(notes) {
		this.notes = notes;
	}
}
