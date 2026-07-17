/**
 * Versioned document templates for the filing package (backlog AI-005). Templates are logic-less
 * Mustache text files under {@code resources/doctemplates/<version>/}, with legal boilerplate
 * shared through partials — defined once, referenced everywhere. A legislative amendment means a
 * new version directory and a manifest bump, never a code change. Documents are template-driven,
 * never AI-generated.
 *
 * <p>This module knows nothing about cases: mapping collected case data into template models is
 * the document-generation engine's job (backlog AI-006).
 */
package ru.restart.app.doctemplate;
