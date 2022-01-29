import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin });

const colLimit = 180;
let curLineLength = 0;

process.stdout.write(`${JSON.stringify(process.argv[2])}: [\n`);

function writeWord(word) {
	const fragment = JSON.stringify(word) + ',';
	if (curLineLength > 0 && curLineLength + fragment.length > colLimit) {
		process.stdout.write('\n');
		curLineLength = 0;
	}
	process.stdout.write(fragment);
	curLineLength += fragment.length;
}

rl.on('line', (word) => {
	if (word) {
		writeWord(word);
	}
});

rl.on('close', () => {
	process.stdout.write('\n],\n');
});
