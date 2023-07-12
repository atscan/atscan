<script>
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import SourceSection from '$lib/components/SourceSection.svelte';
	import BasicPage from '$lib/components/BasicPage.svelte';

	export let data;

	const item = data.item;
</script>

<BasicPage {data} title={item.host} breadcrumb={[{ label: 'PLC Directories', link: '/plcs' }]}>
	<SourceSection {data} model="plc" />
</BasicPage>
