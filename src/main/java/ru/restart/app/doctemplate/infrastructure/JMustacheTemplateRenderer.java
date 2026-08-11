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

@Component
class JMustacheTemplateRenderer implements DocumentTemplateRenderer {

    private static final String ROOT = "doctemplates";

    private final String activeVersion;
    private final Map<DocumentType, Template> compiled = new EnumMap<>(DocumentType.class);

    JMustacheTemplateRenderer() {
        this(loadActiveVersion());
    }

    JMustacheTemplateRenderer(String version) {
        this.activeVersion = version;
        Mustache.Compiler compiler = Mustache.compiler()
                .escapeHTML(false)
                .withLoader(this::open);
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
