/**
 * Shared technical building blocks (errors, security, web, config, event, persistence helpers) used
 * by every business module. Declared an <strong>OPEN</strong> application module so all of its types
 * are exposed and freely usable across modules without per-package named interfaces — appropriate for
 * a cross-cutting utility module, and complemented by {@code sharedModules = "common"} on the
 * application so modules need not declare the dependency explicitly.
 */
@org.springframework.modulith.ApplicationModule(type = org.springframework.modulith.ApplicationModule.Type.OPEN)
package ru.restart.app.common;
