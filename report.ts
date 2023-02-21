import 'dotenv/config';
import axios from 'axios';
import { APIEmbed } from 'discord-api-types/v10';
import fs from 'fs';

const webhookUrlForLogs = process.env.WEBHOOK_URL_FOR_LOGS as string;

async function report() {
	const reportFile = fs.readFileSync('./report.txt');
	const splittedReportFile = reportFile.toString().split('\n');

	let successProduct = 0;
	let failedProducts = 0;

	for (const line of splittedReportFile) {
		if (line.startsWith('success')) {
			successProduct += 1;
		} else {
			failedProducts += 1;
		}
	}

	await axios(webhookUrlForLogs, {
		method: 'POST',
		data: JSON.stringify({
			content: `Here is your daily report, <@255739211112513536>`,
			embeds: [
				{
					title: 'Daily Report from Price Scraper',
					description: `${splittedReportFile.length - 1} Products were scraped today (~${(splittedReportFile.length - 1) / 24} per hour).`,
					fields: [
						{
							name: 'Success',
							value: `${successProduct}/${splittedReportFile.length - 1}`,
							inline: true,
						},
						{
							name: 'Failed',
							value: `${failedProducts}/${splittedReportFile.length - 1}`,
							inline: true,
						},
					],
				} as APIEmbed,
			],
		}),
		headers: {
			'content-type': 'application/json',
		},
	});

	fs.unlinkSync('./report.txt');
}

report();
