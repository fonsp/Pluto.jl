import immer, { produceWithPatches, applyPatches, original } from "../../imports/immer.js"
import { useRef, useState, useEffect } from "../../imports/Preact.js"

// from our friends at https://stackoverflow.com/a/2117523
// i checked it and it generates Julia-legal UUIDs and that's all we need -SNOF
const uuidv4 = () =>
    //@ts-ignore
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))

export let use_firebasey = ({ initial_state, server }) => {
    let patches_to_be_confirmed_by_the_server = useRef([])

    let [state, set_state] = useState(initial_state)

    useEffect(() => {
        let unsubscribe = server.onStatePatches((message) => {
            // I don't wrap this whole function in a try/catch, because I believe immer can do this

            // Apply patches from server to state
            console.log(`patches_to_be_confirmed_by_the_server.current:`, patches_to_be_confirmed_by_the_server.current)

            // First remove the patches that are confirmed
            patches_to_be_confirmed_by_the_server.current = patches_to_be_confirmed_by_the_server.current.filter((patch) => {
                // TODO Message from server does not yet contain confirmation_id
                // To test is just return false (so all patches will be "confirmed")
                return false
                // !message.confirmed_patches.includes(patch.id)
            })

            // Roll back the unconfirmed patches
            set_state(
                immer((state) => {
                    for (let unconfirmed_patch of patches_to_be_confirmed_by_the_server.current) {
                        return applyPatches(state, unconfirmed_patch.reverse_patches)
                    }
                })
            )

            // Apply the patches from the server
            // This _should_ never throw an error, as I believe immer smart enough
            set_state(
                immer((state) => {
                    console.log(`state:`, original(state))
                    console.log(`message:`, message)
                    return applyPatches(state, message.patches)
                })
            )

            // Re-run the original mutate_fn for the patches that are not confirmed
            let next_patches_to_be_confirmed = []
            try {
                for (let unconfirmed_patch of patches_to_be_confirmed_by_the_server.current) {
                    next_patches_to_be_confirmed.push(unconfirmed_patch)
                    set_state(
                        immer((state) => {
                            console.log(`unconfirmed_patch.mutate_fn:`, unconfirmed_patch.mutate_fn)
                            unconfirmed_patch.mutate_fn(state)
                        })
                    )
                }
            } catch (error) {
                console.log(`error:`, error)
                // If re-applying on of the mutations fails, that is fine.
                // We won't add the failed mutate_fn (or any that come after it) back to the list of changes.
                // We know the server will also reject them, so we don't need to worry about them.
                // We might want to throw this error back to the original mutate_fn, but that's a bit too much work for now.
            }
        })
        return () => unsubscribe()
    }, [set_state])

    let update_state = (mutate_fn) => {
        set_state((state) => {
            let [new_state, patches, reverse_patches] = produceWithPatches(state, mutate_fn)

            let patch_id = uuidv4()
            let parent_patch_id = patches_to_be_confirmed_by_the_server.current.length ? patches_to_be_confirmed_by_the_server.current[0].id : null

            patches_to_be_confirmed_by_the_server.current = [
                {
                    id: patch_id,
                    // Save them so we don't apply children of rejected patches
                    parent_patch_id: parent_patch_id,
                    patches: patches,
                    reverse_patches: reverse_patches,
                    mutate_fn: mutate_fn,
                },
                patches_to_be_confirmed_by_the_server.current,
            ]

            // We already apply the patches locally, but we asynchonously also send them to the server
            server.sendPatches({
                id: patch_id,
                parent_patch_id: parent_patch_id,
                patches: patches,
            })

            return new_state
        })
    }

    console.log(`state:`, state)

    return [state, update_state]
}
