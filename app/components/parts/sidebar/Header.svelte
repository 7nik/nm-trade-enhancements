<!-- @component
    A header-divider for the sidebar
 -->

<header><slot/></header>

<style>
    header {
        padding: 10px;
        display: flex;
        justify-content: space-between;
        color: #887992;
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.035em;
        text-transform: uppercase;
        border-bottom: 1px solid #efefef;
        border-top: 1px solid #efefef;
    }
    /* svelte-ignore css-unused-selector */
    header:first-child, header + :global(header) {
        border-top: none;
    }
</style>
