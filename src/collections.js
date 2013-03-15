/*

  The various collections that the API will serve. This is intended to be
  configuration that the rest of the code uses to work out how to deal with
  API requests.
  
  Ideally there should be no special casing in the code.

*/

module.exports = {
  persons: {
    popoloSchemaUrl: 'http://popoloproject.com/schemas/person.json#',
  },
};
