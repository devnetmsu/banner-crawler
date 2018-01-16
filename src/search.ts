import { BannerConfig, BannerInstance } from './banner';
import * as puppeteer from 'puppeteer';
import * as convert from 'xml-js';

export enum Fields {
    firstName = "fname",
    lastName = "lname",
    title = "title",
    department = "dept",
    major = "major",
    class = "class",
    email = "email",
    phone = "lphone",
    office = "office"
}

export enum Operators {
    contains = "contain",
    equals = "equal",
    beginsWith = "begin",
    endsWith = "end",
    soundsLike = "sounds"
}

export interface Criterion {
    field: Fields;
    operator: Operators;
    term: string;
}

export interface BannerQuery {
    fld1_criteria: Fields;
    fld1_operator: Operators;
    fld1_search_term: string;

    fld2_criteria?: Fields;
    fld2_operator?: Operators;
    fld2_search_term?: string;

    fld3_criteria?: Fields;
    fld3_operator?: Operators;
    fld3_search_term?: string;
}

export class CriterionBuilder {
    field: Fields;
    query: Query;
    constructor(query: Query) {
        this.query = query;
        return this;
    }
    email(): CriterionBuilder {
        this.field = Fields.email
        return this;
    }
    firstName(): CriterionBuilder {
        this.field = Fields.firstName;
        return this;
    }
    lastName(): CriterionBuilder {
        this.field = Fields.lastName;
        return this;
    }
    title(): CriterionBuilder {
        this.field = Fields.title;
        return this;
    }
    department(): CriterionBuilder {
        this.field = Fields.department;
        return this;
    }
    major(): CriterionBuilder {
        this.field = Fields.major;
        return this;
    }
    class(): CriterionBuilder {
        this.field = Fields.class;
        return this;
    }
    phone(): CriterionBuilder {
        this.field = Fields.phone;
        return this;
    }
    office(): CriterionBuilder {
        this.field = Fields.office;
        return this;
    }
    contains(term: string): Query {
        return this.query.addCriterion({ field: this.field, operator: Operators.contains, term });
    }
    equals(term: string): Query {
        return this.query.addCriterion({ field: this.field, operator: Operators.equals, term });
    }
    beginsWith(term: string): Query {
        return this.query.addCriterion({ field: this.field, operator: Operators.beginsWith, term });
    }
    endsWith(term: string): Query {
        return this.query.addCriterion({ field: this.field, operator: Operators.endsWith, term });
    }
    soundsLike(term: string): Query {
        return this.query.addCriterion({ field: this.field, operator: Operators.soundsLike, term });
    }
}


export class Query {
    criteria: Criterion[] = [];
    currentCriteria: number = 0;
    addCriterion(criterion: Criterion): Query {
        if (this.criteria.length >= 3) {
            console.warn(`Criteria limit exceeded, criterion not added.`);
        }
        this.criteria.push(criterion);
        return this;
    }
    where(): CriterionBuilder {
        return new CriterionBuilder(this);
    }

    toBannerQuery(): BannerQuery {
        if (this.criteria.length < 1) {
            throw new Error("Must have at least one criterion in a query.");
        }

        const criterion1: Criterion = this.criteria[0];

        const bannerQuery: BannerQuery = {
            fld1_criteria: criterion1.field,
            fld1_operator: criterion1.operator,
            fld1_search_term: criterion1.term
        };

        if (this.criteria.length >= 2) {
            const criterion2: Criterion = this.criteria[1];
            bannerQuery.fld2_criteria = criterion2.field;
            bannerQuery.fld2_operator = criterion2.operator;
            bannerQuery.fld2_search_term = criterion2.term;
        }

        if (this.criteria.length >= 2) {
            const criterion3: Criterion = this.criteria[2];
            bannerQuery.fld3_criteria = criterion3.field;
            bannerQuery.fld3_operator = criterion3.operator;
            bannerQuery.fld3_search_term = criterion3.term;
        }

        return bannerQuery;
    }
}

export class Search {
    queries: Query[] = [];
    config: BannerConfig;
    constructor(config: BannerConfig) {
        this.config = config;
    }
    addQuery(query: Query): Search {
        this.queries.push(query);
        return this;
    }
    async run() {
        const banner: BannerInstance = new BannerInstance(this.config);
        const { browser, page } = await banner.open();

        const responses = [];

        page.on('response', async (response) => {
            await handleResponse(responses, response);
        });

        await page.waitForSelector('#portlet_MSUDirectory1612_WAR_directory1612');

        for (const query of this.queries) {
            await submitQuery(browser, page, query.toBannerQuery());
            await collectResults(browser, page);
        }

        // const results = await Promise.all(responses);

        // const processedResults = await processResults(results);

        await banner.close();

        return responses;
    }
}

async function submitQuery(browser: puppeteer.Browser, page: puppeteer.Page, query: BannerQuery) {
    console.log("Searching");

    await page.waitForSelector('button[id="submit"]');

    for (const property in query) {
        if (query.hasOwnProperty(property)) {
            if (property.includes("search_term")) {
                const inputSelector = `input[id='${property}']`;
                // Type this value
                await page.waitFor(inputSelector);
                await page.evaluate((selector) => {
                    document.querySelector(selector).value = ''
                }, inputSelector);
                await page.type(inputSelector, query[property]);
            } else {
                const selectSelector = `select[id='${property}']`;
                // Select this value
                await page.select(selectSelector);
                await page.select(selectSelector, query[property]);
            }
        }
    }

    await page.click('button[id="submit"]');

    // await page.waitForSelector('div[id="person"] h2');
    await page.waitFor(500, { waitUntil: 'networkidle0' });

    console.log("Search Complete");
}

async function collectResults(browser: puppeteer.Browser, page: puppeteer.Page) {
    const pageNumbers = await page.evaluate(() => {
        const el = document.querySelector('#pagenums');
        return el.innerHTML.match(/\d+/g);
    });

    const lastPageNumber = pageNumbers === null ? 1 : parseInt(pageNumbers[pageNumbers.length - 1]);

    for (let i = 2; i <= lastPageNumber; i++) {
        console.log(`Page ${i}`);

        await page.evaluate((int) => {
            getDetails(int);
            console.log(`Page ${int}`);
        }, i);

        await page.waitFor(500, { waitUntil: 'networkidle0' });

        console.log(`Page ${i} loaded`);
    }

}

async function handleResponse(accumulator: Array<Object>, response: puppeteer.Response) {
    if (response.url().match(/MSUDirectory1612_WAR_directory1612/g)) {
        const xmlBuf = await response.buffer();
        accumulator.push(convert.xml2js(xmlBuf.toString(), { compact: true }));
    }
}

function getDetails(i: number) { return true; };