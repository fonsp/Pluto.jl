import checkScriptIntegrity from './check-integrity.js'
await checkScriptIntegrity('https://cdn.jsdelivr.net/gh/fonsp/msgpack-lite@0.1.27-es.1/dist/msgpack-es.min.mjs', 'sha384-2+BqByYl5TbOcpgy8a6H79MQw2toLuU/l/o3HkpU7WbGnVsYm/9eFrRBMvedrPHN');
// @ts-ignore
import msgpack from "https://cdn.jsdelivr.net/gh/fonsp/msgpack-lite@0.1.27-es.1/dist/msgpack-es.min.mjs"
export default msgpack
