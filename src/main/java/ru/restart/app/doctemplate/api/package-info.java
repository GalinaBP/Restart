/**
 * Public API of the template module — the only package other modules may depend on (enforced by
 * Spring Modulith). Exposes the document catalogue, the rendered-document value, and the
 * rendering contract; template storage, versioning, and the Mustache engine stay internal.
 */
@org.springframework.modulith.NamedInterface("api")
package ru.restart.app.doctemplate.api;
