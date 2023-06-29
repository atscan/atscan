<script>
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import SourceSection from '$lib/components/SourceSection.svelte';
	import BasicPage from '$lib/components/BasicPage.svelte';

	export let data;

	const item = data.item;
</script>

<BasicPage {data} title={item.name} breadcrumb={[{ label: 'Federations', link: '/feds' }]}>
	<SourceSection {data} model="fed" />
</BasicPage>
