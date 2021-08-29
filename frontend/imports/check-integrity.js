export default async function checkScriptIntegrity(file, integrity)
{
    await fetch(file, {integrity: integrity});
    return true
}
