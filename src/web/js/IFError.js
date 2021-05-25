class IFError extends Error {
  constructor (str = '', code, dontLogInstantly) {
    this.message = str
    this.expectedLine = this.message.split('\n')[2]
    this.code = code || null
    if (!dontLogInstantly) this.log()
  }

  log () {
    console.log('Error at:\n', this.expectedLine)
  };
}

export default IFError
