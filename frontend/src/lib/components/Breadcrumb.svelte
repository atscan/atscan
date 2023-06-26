<script>
    export let data;
</script>

<ol class="breadcrumb">
    {#each data as crumb, i}
        <!-- If crumb index is less than the breadcrumb length minus 1 -->
        {#if i < data.length - 1}
            <li class="crumb"><a class="btn variant-soft-secondary" href={crumb.link}>{crumb.label}</a></li>
            <li class="crumb-separator" aria-hidden>&rsaquo;</li>
        {:else}
            <li class="crumb">
                {#if crumb.link}
                    <a class="btn variant-soft-secondary" href={crumb.link}>{@html crumb.label}</a>
                {:else}
                    {@html crumb.label}
                {/if}
            </li>
        {/if}
    {/each}
</ol>