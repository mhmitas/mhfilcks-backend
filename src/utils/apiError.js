export class ApiError extends Error {
    constructor(
        statusCode,
        message = "something went wrong",
        errors = [],
    ) {
        super(message)
        this.statusCode = statusCode;
        this.data = null;
        this.success = false;
        this.errors = errors;
    }
}