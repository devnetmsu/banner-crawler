import * as puppeteer from 'puppeteer';


export interface BannerConfig {
    url?: string
    netid: string
    password: string
    headless?: boolean
}

export class BannerInstance {
    browser: puppeteer.Browser;
    page: puppeteer.Page;
    config: BannerConfig;
    plugin?: Plugin;

    constructor(config: BannerConfig) {
        if (config) {
            // Populate default URL if none is provided.
            if (!config.url) {
                config.url = "https://my.msstate.edu/";
            }
            // Populate default headless option if none is provided.
            if (config.headless === null) {
                config.headless = true
            }
        }

        this.config = config;

        return this;
    }
    async login(url) {
        const page: puppeteer.Page = this.page;
        const config: BannerConfig = this.config;

        console.log("Login");

        await page.goto(url, { waitUntil: 'networkidle2' });

        // Type the username
        await page.waitFor('input[name=username]');
        await page.type('input[name=username]', config.netid);

        // Type the password
        await page.waitFor('input[name=password]');
        await page.type('input[name=password]', config.password);

        await page.click('input[type="submit"]');
        await page.waitForSelector('#portlet_MSUDirectory1612_WAR_directory1612');

        console.log("Login Complete");
    }
    async open(url: string = 'https://my.msstate.edu/') {
        this.browser = await puppeteer.launch({ headless: this.config.headless });
        this.page = await this.browser.newPage();

        await this.login(url);

        return { browser: this.browser, page: this.page };
    }
    async close() {
        await this.browser.close();
    }
}