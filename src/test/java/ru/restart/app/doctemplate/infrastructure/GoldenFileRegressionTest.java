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

/**
 * The backlog's regression requirement: "existing generated documents remain unchanged when
 * unrelated templates are updated." Each document rendered from the reference case is compared
 * byte-for-byte against a checked-in golden file, so editing one template can never silently
 * change another document's output.
 *
 * <p>Workflow for an INTENDED template change: delete the affected golden file(s) under
 * {@code src/test/resources/doctemplate/golden/<version>/}, run the test once (it regenerates the
 * file and fails asking for review), review the diff in git, run again — green. The regenerated
 * golden then documents the change in the PR.
 */
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
