<!-- @component
    A dialog window for saving a filter set
 -->
<script lang="ts">
    import { toPascalCase } from "../../utils/utils";
    import DialogWindow from "./DialogWindow.svelte";

    /**
     * The entered data
     */
    export let onclose: (data: {name:string,includeSett:boolean}|null) => any;

    let includeSett = true;
    let name = "";
    let closed = false;

    function save(button: string | null) {
        if (closed) return;
        closed = true;
        
        if (button !== "OK" || !name.trim()) {
            onclose(null);
        } else {
            onclose({ 
                name: toPascalCase(name), 
                includeSett,
            });
        }
    }
    function keypress(ev: KeyboardEvent) {
        if (ev.key === "Enter") {
            save("OK");
        }
    }
</script>

<DialogWindow buttons={["OK", "Cancel"]} onclose={save}>
    <p class="text-heading text-prominent">
        Saving the filters
    </p>
    <p class="text-body text-prominent">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>
            <span class="checkbox-slider">
                <input type="checkbox" class="checkbox-slider--checkbox" 
                    bind:checked={includeSett}
                > 
                <span class="checkbox-slider--knob"></span>
            </span>
            <span class="checkbox-slider--label">
                Include the selected series?
            </span>
        </label>
    </p>
    <p class="text-body text-prominent">
        Enter the filter set name: <br>
        <input bind:value={name} on:keypress={keypress} style:width="100%">
    </p>
</DialogWindow>
