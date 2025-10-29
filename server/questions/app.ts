import express, { type Router, type Request, type Response } from "express";
import { assert } from "valibot";

import { type QuestionSetManager } from "./question-set-manager.js";
import { verifyRequest } from "../utils/verifyrequest.js";
import { GET_QUESTION_SETS_PATH, GetQuestionSetsRequestSchema, GetQuestionSetsResponseSchema, type GetQuestionSetsResponse } from "../../shared/questions/get-question-sets.js";


export class QuestionApp {
	constructor(private readonly questionSetManager: QuestionSetManager) {}
	
	private getQuestionSets(req: Request, res: Response): void {
		verifyRequest(req.body, GetQuestionSetsRequestSchema, `Invalid GetQuestionSetsRequest: ${JSON.stringify(req.body)}`);
		
		const questionSets = this.questionSetManager.getQuestionSets();
		
		const response: GetQuestionSetsResponse = Array.from(questionSets)
			.map(([id, questionSet]) => ({
				id,
				name: questionSet.fileName,
				size: questionSet.questions.length
			}));
		assert(GetQuestionSetsResponseSchema, response);
		res.send(response);
	}
	
	public getRouter(): Router {
		return express.Router()
			.get(GET_QUESTION_SETS_PATH, (req, res) => this.getQuestionSets(req, res));
	}
}
