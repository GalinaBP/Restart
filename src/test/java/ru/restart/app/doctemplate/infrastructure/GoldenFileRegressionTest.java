package ru.restart.app.doctemplate.infrastructure;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import ru.restart.app.doctemplate.SampleModels;
import ru.restart.app.doctemplate.api.DocumentType;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.fail;

class GoldenFileRegressionTest {

    private static final Path GOLDEN_DIR = Path.of("src", "test", "resources", "doctemplate", "golden");

    private final JMustacheTemplateRenderer renderer = new JMustacheTemplateRenderer();

    @ParameterizedTest
    @EnumSource(DocumentType.class)
    void renderedDocumentMatchesItsGolden(DocumentType type) throws IOException {
        String rendered = renderer.render(type, SampleModels.fullCase()).text();
        Path golden = GOLDEN_DIR.resolve(renderer.activeVersion())
                .resolve(type.templateName() + ".txt");

        if (!Files.exists(golden)) {
            Files.createDirectories(golden.getParent());
            Files.writeString(golden, rendered, StandardCharsets.UTF_8);
            fail("Golden file was missing and has been generated: " + golden
                    + " — review it (git diff) and re-run the test.");
        }

        assertThat(rendered)
                .as("Output of %s changed. If intended, delete %s and re-run to regenerate.",
                        type, golden)
                .isEqualTo(Files.readString(golden, StandardCharsets.UTF_8));
    }
}
