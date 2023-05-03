import { spawn } from "child_process";
import { createInterface } from "readline";
import { PassThrough } from "stream";
import chalk from "chalk";
import { Command } from "commander";
import { join } from "path";
import { homedir } from "os";
const command = new Command();
const userHomeDir = homedir();
const dirGitCommands = join(userHomeDir, ".oh-my-zsh/plugins/git/README.md");
command
    .description("Buscar comandos de git por cadena")
    // .usage("<cadena>")
    // .arguments("<cadena>")
    .option("-s, --search <cadena>", "Cadena a buscar en los comandos de git")
    .action(async (option) => {
    let searchString = option.search;
    if (!searchString) {
        const rlPrompt = createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        await new Promise((resolve) => {
            rlPrompt.question("Introduzca la cadena a buscar: ", (answer) => {
                searchString = answer.trim();
                resolve();
            });
        });
        rlPrompt.close();
    }
    const gitCommands = {};
    const awk = spawn("awk", [
        `/Aliases/{f=1} /Main branch preference/{f=0} f`,
        `${dirGitCommands}`,
    ]);
    const rl = createInterface({
        input: awk.stdout.pipe(new PassThrough({ encoding: "utf8" })),
        crlfDelay: Infinity,
    });
    rl.on("line", (line) => {
        if (line) {
            const lineCommand = line.split("|").filter((ele) => ele.trim());
            const shortcut = lineCommand[0].trim();
            const match = lineCommand[1];
            const rgx = new RegExp(`\\b${searchString.trim()}\\b`);
            if (rgx.test(match)) {
                gitCommands[searchString] ??= [];
                gitCommands[searchString].push([shortcut, match].join(" => "));
            }
        }
    });
    rl.on("close", () => {
        const commands = gitCommands[searchString];
        if (commands) {
            console.log(chalk.yellow(`Comandos de git que contienen "${searchString}":`));
            for (const command of commands) {
                console.log(`${chalk.green(command)}`);
            }
        }
        else {
            console.error(chalk.red(`No se encontraron comandos de git que contengan "${searchString}"`));
        }
    });
    awk.on("error", (err) => {
        console.error(chalk.red(`Error al ejecutar el comando awk: ${err.message}`));
    });
    awk.stderr.on("data", (data) => {
        console.error(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        chalk.red(`Error en la ejecución del comando awk: ${data}`));
    });
    awk.on("close", (code) => {
        if (code !== 0) {
            console.error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            chalk.red(`El comando awk ha salido con un código de salida ${code}`));
        }
    });
});
command.parse(process.argv);
