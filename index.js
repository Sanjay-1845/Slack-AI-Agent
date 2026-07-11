import pkg from '@slack/bolt';
const { App } = pkg;
import { webClient } from '@slack/web-api';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import { Timestamp } from 'mongodb';

dotenv.config();

const logs = {
    info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
    error: (msg, ...args) => console.log(`[ERROR] ${msg}`, ...args),
    debug: (msg, ...args) => process.env.NODE_ENV === 'development' && console.log(`[DEBUG] ${msg}`, ...args)
}

class SlackAIAgent{
    constructor() {
        this.app = express();
        this.slack = new App({
            token: process.env.SLACK_BOT_TOKEN,
            signingSecret: process.env.SLACK_SIGNING_SECRET,
            socketMode: true,
            appToken: process.env.SLACK_APP_TOKEN
        });
        this.webClient = new webClient(process.env.SLACK_BOT_TOKEN);
        this.openAI = new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: 'gpt-4',
            temperature: 0.3
        });
        this.setupSlackEvents();
        this.setupExpress();
    }

    setupSlackEvents() {
        this.slack.event('team_join', async ({ event }) => {
            try {
                log.info(`New user joined: ${event.user.real_name} || ${event.user.name}`);
                const userInfo = await this.getUserInfo(event.user.id);
                await this.analyzeAndPostMember(userInfo);
            }
            catch (error) {
                this.logs.error('Error processing team_join event:', error.message);
            }
        });
        this.slack.event('member_joined_channel', async ({ event }) => {
            try {
                if(event.channel_type === 'C') {
                    log.info(`User ${event.user} joined channel || ${event.channel}`);
                    const userInfo = await this.getUserInfo(event.user);
                    await this.analyzeAndPostMember(userInfo);
                }
            }
            catch (error) {
                this.logs.error('Error processing member_joined_channel event:', error.message);
            }
        });
    }

    setupExpress() {
        this.app.use(express.json());
    
        this.app.get('/health', (req, res) => {
            res.json({ status: 'Healthy', timestamp: new Date().toISOString() });
        })

        if(process.env.NODE_ENV === 'development') {
            this.app.post('/test/analyze-member', async (req, res) => {
                try {
                    const { memberInfo } = req.body;
                    if(!memberInfo  ) {
                        return res.status(400).json({ error: 'Member info is required' });
                    }
                    const analysis = await this.analyzeAndPostMember(memberInfo);
                    res.json({ success: true, analysis, timestamp: new Date().toISOString() });
                } catch (error) {
                    logs.error('Error in test/analyze-member:', error.message);
                    res.status(500).json({ error: 'Analysis Failed', message: error.message });
                }
            });
        }
        
        this.app.use((err, req, res, next) => {
            logs.error('Express error:', err.message);
            res.status(500).json({ error: 'Internal Server Error', message: err.message });
        })
        
    }

    async getUserInfo(userId) {
        const result = await this.webClient.users.info({ user: userId });
        const user = result.user;
        return {
            id: user.id,
            name: user.real_name || user.name,
            username: user.name,
            email: user.profile?.email,
            title: user.profile?.title,
            timezone: user.tz,
            profile: {
                firstName: user.profile?.first_name,
                lastName: user.profile?.last_name,
                statusText: user.profile?.status_text
            }
        } 
    }

    async analyzeAndPostMember(memberInfo) {
        let analysisId = null;
        try {
            log.info(`Processing member: ${memberInfo.name}`)
            const researchData = await this.doBasicResearch(memberInfo);
            const analysis = await this.analyzeWithAI(memberInfo, researchData);
            log.info(`Saving analysis to database for ${memberInfo.name}`);
            analysisId = await saveMemberAnalysis(memberInfo, analysis, researchData);
            await this.postAnalysisToChannel(memberInfo, analysis, researchData);

            if (analysisId) {
                await markAsSentToSlack(analysisId);
            }
        } catch (error) {
            log.error(`Error processing ${memberInfo.name}:`, error.message);
            if (analysisId) {
                log.info(`Analysis ${analysisId} saved to database but not sent to Slack due to error`);
            }
            throw error;
        }
    }

    async doBasicResearch(memberInfo) {
        const results = [];
        try {
            if (memberInfo.email && !this.isPersonalEmail(memberInfo.email)) {
                const domain = memberInfo.email.split('@')[1];
                const companyInfo = await this.getCompanyInfo(domain);
                if (companyInfo) results.push(companyInfo);

                if (memberInfo.name) {
                    const githubInfo = await this.getGitHubInfo(memberInfo.name);
                    if (githubInfo) results.push(githubInfo);
                }
            }
        } catch (error) {
            log.error('Research error:', error.message);
        }
        return results;
    }

    
    async getCompanyInfo(domain) {
        try {
            const response = await axios.get(`https://www.${domain}`, {
                timeout: 5000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const titleMatch = response.data.match(/<title>(.*?)<\/title>/i)
            const title = titleMatch ? titleMatch[1] : `Company: ${domain}`;

            return {
                url: `https://www.${domain}`,
                title: title,
                content: `Company website for ${domain}`,
                type: 'company'
            }
        } catch (error) {
            log.error(`Could not fetch ${domain}:`, error.message);
            return null;
        }
    }
    
}