import { Resvg } from "@resvg/resvg-js";
import type { APIContext, InferGetStaticPropsType } from "astro";
import satori, { type SatoriOptions } from "satori";
import { html } from "satori-html";
import Lora from "@/assets/lora-regular.ttf";
import LoraBold from "@/assets/lora-bold.ttf";
import { getAllPosts } from "@/data/post";
import { siteConfig } from "@/site.config";
import { getFormattedDate } from "@/utils/date";

const cardOptions: SatoriOptions = {
	fonts: [
		{
			data: Buffer.from(Lora),
			name: "Lora",
			style: "normal",
			weight: 400,
		},
		{
			data: Buffer.from(LoraBold),
			name: "Lora",
			style: "normal",
			weight: 700,
		},
	],
	height: 1920,
	width: 1080,
};

function stripMarkdown(md: string): string {
	return md
		.replace(/^---[\s\S]*?---\n*/m, "") // frontmatter
		.replace(/^#{1,6}\s+/gm, "") // headings
		.replace(/!\[.*?\]\(.*?\)/g, "") // images
		.replace(/\[([^\]]*)\]\(.*?\)/g, "$1") // links → text
		.replace(/(\*{1,2}|_{1,2})(.*?)\1/g, "$2") // bold/italic
		.replace(/`{1,3}[^`]*`{1,3}/g, "") // inline code
		.replace(/^[-*+]\s+/gm, "• ") // list items
		.replace(/^\d+\.\s+/gm, "") // ordered list
		.replace(/^>\s+/gm, "") // blockquotes
		.replace(/\n{2,}/g, "\n\n") // collapse newlines
		.trim();
}

const markup = (title: string, pubDate: string, body: string) => {
	const paragraphs = body
		.split("\n\n")
		.map((p) => `<p tw="text-2xl leading-relaxed m-0 mb-4">${p}</p>`)
		.join("");

	return html(
		`<div tw="flex flex-col w-full h-full bg-[#1d1f21] text-[#c9cacc] p-14">
		<div tw="flex flex-col flex-1">
			<p tw="text-2xl text-[#2bbc89] mb-2">${pubDate}</p>
			<h1 tw="text-5xl font-bold leading-tight text-white mb-8">${title}</h1>
			<div tw="flex flex-col flex-1">
				${paragraphs}
			</div>
		</div>
		<div tw="flex items-center justify-between w-full pt-8 border-t border-[#2bbc89] text-xl">
			<div tw="flex items-center">
				<svg height="48" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 272 480">
					<path
						fill="#cdffb8"
						d="M181.334 93.333v-40L226.667 80v40zM136.001 53.333 90.667 26.667v426.666L136.001 480zM45.333 220 0 193.334v140L45.333 360z"
					/>
					<path
						fill="#d482ab"
						d="M90.667 26.667 136.001 0l45.333 26.667-45.333 26.666zM181.334 53.33l45.333-26.72L272 53.33 226.667 80zM136 240l-45.333-26.67v53.34zM0 193.33l45.333-26.72 45.334 26.72L45.333 220zM181.334 93.277 226.667 120l-45.333 26.67z"
					/>
					<path
						fill="#2abc89"
						d="m136 53.333 45.333-26.666v120L226.667 120V80L272 53.333V160l-90.667 53.333v240L136 480V306.667L45.334 360V220l45.333-26.667v73.334L136 240z"
					/>
				</svg>
				<p tw="ml-3 font-semibold">${siteConfig.title}</p>
			</div>
			<p>by ${siteConfig.author}</p>
		</div>
	</div>`,
	);
};

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export async function GET(context: APIContext) {
	const { pubDate, title, body } = context.props as Props;

	const postDate = getFormattedDate(pubDate, {
		month: "long",
		weekday: "long",
	});

	const MAX_CHARS = 3000;
	const stripped = stripMarkdown(body);
	const plainBody = stripped.length > MAX_CHARS ? stripped.slice(0, MAX_CHARS).trimEnd() + "..." : stripped;

	const svg = await satori(markup(title, postDate, plainBody), cardOptions);
	const pngBuffer = new Resvg(svg).render().asPng();
	const png = new Uint8Array(pngBuffer);
	return new Response(png, {
		headers: {
			"Cache-Control": "public, max-age=31536000, immutable",
			"Content-Type": "image/png",
		},
	});
}

export async function getStaticPaths() {
	const posts = await getAllPosts();
	return posts.map((post) => ({
		params: { slug: post.id },
		props: {
			body: post.body ?? "",
			pubDate: post.data.updatedDate ?? post.data.publishDate,
			title: post.data.title,
		},
	}));
}
