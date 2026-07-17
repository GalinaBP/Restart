package ru.restart.app.doctemplate.infrastructure;

import com.samskivert.mustache.Mustache;
import com.samskivert.mustache.Template;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;
import ru.restart.app.doctemplate.domain.DocumentTemplateRenderer;
import ru.restart.app.doctemplate.api.DocumentType;
import ru.restart.app.doctemplate.api.RenderedDocument;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.EnumMap;
import java.util.Map;

/**
 * Mustache-backed renderer. The active version comes from {@code doctemplates/manifest.yml}; all
 * six templates of that version are compiled at startup, so a broken or incomplete template set
 * fails the deployment instead of failing a user's filing. Partials ({@code {{> partials/...}}})
 * resolve inside the same version directory — shared legal boilerplate is written once per
 * version and referenced everywhere.
 */
@Component
class JMustacheTemplateRenderer implements DocumentTemplateRenderer {

    private static final String ROOT = "doctemplates";

    private final String activeVersion;
    private final Map<DocumentType, Template> compiled = new EnumMap<>(DocumentType.class);

    JMustacheTemplateRenderer() {
        this(loadActiveVersion());
    }

    /** Version-explicit constructor, used by tests to compile a specific edition. */
    JMustacheTemplateRenderer(String version) {
        this.activeVersion = version;
        Mustache.Compiler compiler = Mustache.compiler()
                .escapeHTML(false)          // plain-text documents, not HTML
                .withLoader(this::open);    // partials resolve within the version directory
        for (DocumentType type : DocumentType.values()) {
            try (Reader reader = open(type.templateName())) {
                compiled.put(type, compiler.compile(reader));
            } catch (IOException ex) {
                throw new UncheckedIOException("Cannot read template " + type, ex);
            }
        }
    }

    private static String loadActiveVersion() {
        try (InputStream in = new ClassPathResource(ROOT + "/manifest.yml").getInputStream()) {
            Map<String, Object> manifest = new Yaml().load(in);
            Object version = manifest.get("activeVersion");
            if (version == null || version.toString().isBlank()) {
                throw new IllegalStateException(ROOT + "/manifest.yml: activeVersion is missing");
            }
            return version.toString();
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot read " + ROOT + "/manifest.yml", ex);
        }
    }

    private Reader open(String name) {
        String path = ROOT + "/" + activeVersion + "/" + name + ".mustache";
        try {
            return new InputStreamReader(new ClassPathResource(path).getInputStream(),
                    StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new UncheckedIOException("Template file missing: " + path, ex);
        }
    }

    @Override
    public String activeVersion() {
        return activeVersion;
    }

    @Override
    public RenderedDocument render(DocumentType type, Map<String, Object> model) {
        return new RenderedDocument(type, activeVersion, compiled.get(type).execute(model));
    }
}
