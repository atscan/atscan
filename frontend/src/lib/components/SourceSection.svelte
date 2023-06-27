<script>
    import { CodeBlock, clipboard } from '@skeletonlabs/skeleton';
    
    export let model = 'pds';
    export let data;

    const models = {
        pds: { url: 'https://api.atscan.net/pds/%', key: 'host' },
        did: { url: 'https://api.atscan.net/%', key: 'did' },
    }
    const config = models[model]
    const url = config.url.replace('%', data.item[config.key])
</script>

<h2 class="h2">Source</h2>
<CodeBlock code={JSON.stringify(data.item, null, 2)} language="json" />

<div> 
    <p>You can get this data as JSON by making a simple HTTP GET request to our API endpoint:</p>
    <div class="mt-4 mb-8 flex gap-4 w-full">
        <div data-clipboard="exampleElement" class="textarea p-2">{url}</div>
        <button use:clipboard={{ element: 'exampleElement' }} class="btn variant-filled"><i class="fa-regular fa-clipboard mr-2"></i> Copy</button>
        <a href={url} class="btn variant-filled" target="_blank">Open <i class="ml-2 fa-solid fa-arrow-right"></i></a>
    </div>
    <!--p>Example:</p>
    <CodeBlock code={url} class="mt-4" /-->
</div>