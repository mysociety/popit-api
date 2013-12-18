"use strict";

exports.person = person;

function person(attrs) {
  attrs.memberships = [];
  attrs.links = [];
  attrs.contact_details = [];
  attrs.identifiers = [];
  attrs.other_names = [];
  return attrs;
}
