import { run } from 'npm-check-updates';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';

const execPromise = promisify(exec);

async function runCommand(command) {
    console.log(`> ${command}`);
    try {
        const { stdout, stderr } = await execPromise(command);
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        return { stdout, stderr, error: null };
    } catch (error) {
        console.error(`Error executing command: ${command}`);
        console.error(error);
        return { stdout: '', stderr: error.stderr, error };
    }
}

async function main() {
    const args = process.argv.slice(2);
    const noRevert = args.includes('--no-revert');
    const targetPackages = args.filter(arg => !arg.startsWith('--'));

    const header = targetPackages.length > 0
        ? `🤖 Starting automated upgrade for: ${targetPackages.join(', ')}...`
        : `🤖 Starting automated dependency upgrade process...`;

    console.log(header);
    if (noRevert) {
        console.log('⚠️  --no-revert flag is active. Will not revert changes on test failure.');
    }

    // 1. Backup package.json
    const originalPackageJson = await readFile('package.json', 'utf-8');
    console.log('✅ Backed up package.json');

    try {
        // 2. Check for updates
        console.log('🔍 Checking for outdated packages...');
        const ncuOptions = {
            packageFile: 'package.json',
            upgrade: true,
            target: 'latest',
        };

        if (targetPackages.length > 0) {
            ncuOptions.filter = targetPackages;
        }

        const upgraded = await run(ncuOptions);

        if (Object.keys(upgraded).length === 0) {
            console.log(`✅ ${targetPackages.length > 0 ? targetPackages.join(', ') + ' are' : 'All dependencies are'} up to date. Exiting.`);
            return;
        }

        console.log('⬆️  The following packages were upgraded:');
        console.table(upgraded);

        // 3. Install new packages
        console.log('📦 Installing upgraded packages...');
        const installResult = await runCommand('npm install');
        if (installResult.error) {
            throw new Error('npm install failed. Aborting and reverting changes.');
        }

        // 4. Run tests
        console.log('🧪 Running unit tests to verify changes...');
        const testResult = await runCommand('npm run test:unit');
        if (testResult.error) {
            if (noRevert) {
                console.warn('⚠️ Tests failed, but --no-revert is active. Leaving changes in place.');
                process.exit(1);
            }
            throw new Error('Tests failed after upgrade. Aborting and reverting changes.');
        }

        console.log('✅ Tests passed successfully!');
        
        // 5. Stage changes
        console.log('📝 Staging package.json and package-lock.json...');
        await runCommand('git add package.json package-lock.json');

        console.log('🎉 Upgrade successful! Changes are staged for your review.');
        console.log('✨ Next steps: Review the changes with `git diff --staged` and commit them if they look good.');

    } catch (error) {
        console.error(`❌ ${error.message}`);
        if (noRevert) {
            console.error('An error occurred during the upgrade process, but no changes will be reverted.');
            process.exit(1);
        }
        console.log('⏪ Reverting package.json to its original state...');
        await writeFile('package.json', originalPackageJson, 'utf-8');
        console.log('⏪ Installing original packages to restore lockfile...');
        await runCommand('npm install');
        console.log('✅ Revert complete.');
        process.exit(1);
    }
}

main();