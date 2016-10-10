package com.acabra.calculator.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Created by Agustin on 9/28/2016.
 */
public class TableHistoryResponse extends SimpleResponse {

    protected String tableHTML;

    public TableHistoryResponse() {}

    public TableHistoryResponse(long id, String tableHTML) {
        this.id = id;
        this.tableHTML = tableHTML;
    }

    @JsonProperty("tableHTML")
    public String getTableHTML() {
        return tableHTML;
    }
}
