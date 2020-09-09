// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import { jsx } from '@emotion/core';
import { useRecoilValue } from 'recoil';
import React, { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import {
  DetailsList,
  DetailsRow,
  DetailsListLayoutMode,
  SelectionMode,
  CheckboxVisibility,
  IDetailsGroupRenderProps,
  IGroup,
} from 'office-ui-fabric-react/lib/DetailsList';
import { GroupHeader } from 'office-ui-fabric-react/lib/GroupedList';
import { IOverflowSetItemProps, OverflowSet } from 'office-ui-fabric-react/lib/OverflowSet';
import { Link } from 'office-ui-fabric-react/lib/Link';
import { TooltipHost } from 'office-ui-fabric-react/lib/Tooltip';
import { IconButton, ActionButton } from 'office-ui-fabric-react/lib/Button';
import { ScrollablePane, ScrollbarVisibility } from 'office-ui-fabric-react/lib/ScrollablePane';
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky';
import formatMessage from 'format-message';
import { RouteComponentProps } from '@reach/router';
import isEmpty from 'lodash/isEmpty';
import { QnAFile } from '@bfc/shared/src/types';
import { QnASection } from '@bfc/shared';
import { qnaUtil } from '@bfc/indexers';

import {
  dialogsState,
  qnaFilesState,
  projectIdState,
  localeState,
  settingsState,
} from '../../recoilModel/atoms/botState';
import { dispatcherState } from '../../recoilModel';
import { getBaseName } from '../../utils/fileUtil';
import { EditableField } from '../../components/EditableField';
import { classNames, AddTemplateButton } from '../../components/AllupviewComponets/styles';

import { formCell, content, addIcon, divider, rowDetails, icon, addAlternative } from './styles';

const noOp = () => undefined;

interface QnASectionItem extends QnASection {
  fileId: string;
  dialogId: string;
  used: boolean;
  expand: boolean;
}

interface TableViewProps extends RouteComponentProps<{}> {
  dialogId: string;
}

const TableView: React.FC<TableViewProps> = (props) => {
  const actions = useRecoilValue(dispatcherState);
  const dialogs = useRecoilValue(dialogsState);
  const qnaFiles = useRecoilValue(qnaFilesState);
  const projectId = useRecoilValue(projectIdState);
  const locale = useRecoilValue(localeState);
  const settings = useRecoilValue(settingsState);
  const {
    // addQnAImport,
    removeQnAImport,
    // setMessage,
    addQnAPairs,
    removeQnAPairs,
    addQnAQuestion,
    // removeQnAQuestion,
    updateQnAAnswer,
    updateQnAQuestion,
    // updateQnAFile,
  } = useRecoilValue(dispatcherState);

  // const { languages, defaultLanguage } = settings;
  console.log(settings);

  const { dialogId } = props;
  const activeDialog = dialogs.find(({ id }) => id === dialogId);
  const targetFileId = dialogId.endsWith('.source') ? dialogId : `${dialogId}.${locale}`;
  const qnaFile = qnaFiles.find(({ id }) => id === targetFileId);
  const limitedNumber = 1;
  const generateQnASections = (file: QnAFile): QnASectionItem[] => {
    return file
      ? file.qnaSections.map((qnaSection) => {
          const qnaDialog = dialogs.find((dialog) => file.id === `${dialog.id}.${locale}`);
          return {
            fileId: file.id,
            dialogId: qnaDialog?.id || '',
            used: !!qnaDialog,
            expand: false,
            key: qnaSection.Body,
            ...qnaSection,
          };
        })
      : [];
  };
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [qnaSections, setQnASections] = useState<QnASectionItem[]>([]);
  useEffect(() => {
    if (isEmpty(qnaFiles)) return;

    const allSections = qnaFiles.reduce((result: any[], qnaFile) => {
      const res = generateQnASections(qnaFile);
      return result.concat(res);
    }, []);

    if (dialogId === 'all') {
      setQnASections(allSections);
    } else {
      const dialogSections = allSections.filter((t) => t.dialogId === dialogId);
      setQnASections(dialogSections);
    }
  }, [qnaFiles, dialogId, projectId]);

  const importedFiles = useMemo(() => {
    const results: QnAFile[] = [];
    if (qnaFile && qnaFile.imports) {
      qnaFile.imports.forEach(({ id }) => {
        const fileId = getBaseName(id);
        const target = qnaFiles.find(({ id }) => id === fileId);
        if (target) results.push(target);
      });
    }

    return results;
  }, [qnaFile, qnaFiles]);
  const importedSourceFiles = importedFiles.filter(({ id }) => id.endsWith('.source'));

  const importedSourceFileSections = importedSourceFiles.reduce((result: any[], qnaFile) => {
    const res = generateQnASections(qnaFile);
    return result.concat(res);
  }, []);

  const toggleExpandRow = (sectionId: string, expand?: boolean) => {
    const newSections = qnaSections.map((item) => {
      if (item.sectionId === sectionId) {
        return {
          ...item,
          expand: expand === undefined ? !item.expand : expand,
        };
      } else {
        return item;
      }
    });
    setQnASections(newSections);
  };

  const deleteQnASection = (sectionId: string) => {
    actions.setMessage('item deleted');
    if (qnaFile) {
      removeQnAPairs({
        id: qnaFile.id,
        sectionId,
      });
    }
  };

  const onCreateNewQnAPairs = (fileId: string) => {
    const newQnAPair = qnaUtil.generateQnAPair();
    addQnAPairs({ id: fileId, content: newQnAPair });
  };

  const onCreateNewQuestion = useCallback(
    (fileId, sectionId) => {
      if (qnaFile) {
        const payload = {
          id: fileId,
          sectionId,
          content: 'Add new question',
        };
        addQnAQuestion(payload);
        setFocusedIndex(qnaSections.length);
      }
    },
    [qnaFile]
  );

  const onRenderGroupHeader: IDetailsGroupRenderProps['onRenderHeader'] = (props) => {
    const groupName = props?.group?.name || '';
    const groupFileId = props?.group?.key || '';
    const isImportedSource = groupFileId !== dialogId;

    const onRenderItem = (item: IOverflowSetItemProps): JSX.Element => {
      return <IconButton menuIconProps={{ iconName: 'Edit' }} onClick={item.onClick} />;
    };

    const onRenderOverflowButton = (overflowItems: any[] | undefined): JSX.Element => {
      return (
        <IconButton
          menuIconProps={{ iconName: 'More' }}
          menuProps={{ items: overflowItems || [] }}
          role="menuitem"
          title="More options"
        />
      );
    };

    const onRenderTitle = () => {
      return (
        <div className={classNames.groupHeader}>
          {isImportedSource && (
            <Fragment>
              <div>Source: </div>
              <Link className={classNames.groupHeaderSourceName} onClick={noOp}>
                {groupName}
              </Link>
              <OverflowSet
                aria-label={formatMessage('Edit source')}
                items={[
                  {
                    key: 'edit',
                    name: 'edit',
                    onClick: noOp,
                  },
                ]}
                overflowItems={[
                  {
                    key: 'delete',
                    // eslint-disable-next-line format-message/literal-pattern
                    name: formatMessage(`Remove from ${dialogId}`),
                    onClick: () => {
                      if (!qnaFile) return;
                      removeQnAImport({ id: qnaFile.id, sourceId: groupFileId });
                    },
                  },
                ]}
                role="menubar"
                onRenderItem={onRenderItem}
                onRenderOverflowButton={onRenderOverflowButton}
              />
            </Fragment>
          )}
          {!isImportedSource && <div>{groupName}</div>}
        </div>
      );
    };
    if (props) {
      return (
        <Fragment>
          <GroupHeader {...props} selectionMode={SelectionMode.none} onRenderTitle={onRenderTitle}></GroupHeader>
          <div className={classNames.groupHeaderAddPair}>
            <ActionButton
              data-testid={'addQnAPairButton'}
              iconProps={{ iconName: 'Add' }}
              styles={AddTemplateButton}
              onClick={() => {
                if (!qnaFile) return;
                onCreateNewQnAPairs(qnaFile.id);
                actions.setMessage('item added');
              }}
            >
              {formatMessage('Add QnA Pair')}
            </ActionButton>
          </div>
          <div css={divider}> </div>
        </Fragment>
      );
    }

    return null;
  };

  const getKeyCallback = useCallback((item) => item.uuid, []);

  const getTableColums = () => {
    const tableColums = [
      {
        key: 'ToggleShowAll',
        name: '',
        fieldName: 'Chevron',
        minWidth: 40,
        maxWidth: 40,
        isResizable: true,
        onRender: (item) => {
          return (
            <IconButton
              ariaLabel="ChevronDown"
              iconProps={{ iconName: item.expand ? 'ChevronDown' : 'ChevronRight' }}
              styles={icon}
              title="ChevronDown"
              onClick={() => toggleExpandRow(item.sectionId)}
            />
          );
        },
      },
      {
        key: 'Question',
        name: formatMessage('Question'),
        fieldName: 'question',
        minWidth: 250,
        maxWidth: 450,
        isResizable: true,
        data: 'string',
        onRender: (item: QnASectionItem) => {
          const questions = item.Questions;
          const showingQuestions = item.expand ? questions : questions.slice(0, limitedNumber);
          //This question content of this qna Section is '#?'
          const isQuestionEmpty = showingQuestions.length === 1 && showingQuestions[0].content === '';
          const isSourceSectionInDialog = item.fileId.endsWith('.source') && !dialogId.endsWith('.source');
          const isAllowEdit = dialogId !== 'all' && !isSourceSectionInDialog;

          const addQuestionButton = (
            <ActionButton
              iconProps={{ iconName: 'Add', styles: addIcon }}
              styles={addAlternative}
              onClick={(e) => onCreateNewQuestion(item.fileId, item.sectionId)}
            >
              {formatMessage('add alternative phrasing')}
            </ActionButton>
          );

          return (
            <div data-is-focusable css={formCell}>
              {showingQuestions.map((question) => {
                return (
                  <EditableField
                    key={question.id}
                    ariaLabel={formatMessage(`Question is {content}`, { content: question.content })}
                    depth={0}
                    disabled={isAllowEdit}
                    id={question.id}
                    name={question.content}
                    value={question.content}
                    onBlur={(_id, value) => {
                      const newValue = value?.trim().replace(/^#/, '');
                      if (newValue) {
                        updateQnAQuestion({
                          id: item.fileId,
                          sectionId: item.sectionId,
                          questionId: question.id,
                          content: newValue,
                        });
                      }
                    }}
                    onChange={() => {}}
                  />
                );
              })}
              {addQuestionButton}
            </div>
          );
        },
      },
      {
        key: 'Answer',
        name: formatMessage('Answer'),
        fieldName: 'answer',
        minWidth: 250,
        maxWidth: 450,
        isResizable: true,
        data: 'string',
        onRender: (item) => {
          const isSourceSectionInDialog = item.fileId.endsWith('.source') && !dialogId.endsWith('.source');
          const isAllowEdit = dialogId !== 'all' && !isSourceSectionInDialog;
          return (
            <div data-is-focusable css={formCell}>
              <EditableField
                multiline
                ariaLabel={formatMessage(`Answer is {content}`, { content: item.Answer })}
                depth={0}
                disabled={isAllowEdit}
                id={item.sectionId}
                name={item.Answer}
                value={item.Answer}
                onBlur={(_id, value) => {
                  const newValue = value?.trim().replace(/^#/, '');
                  if (newValue) {
                    updateQnAAnswer({
                      id: item.fileId,
                      sectionId: item.sectionId,
                      content: newValue,
                    });
                  }
                }}
                onChange={() => {}}
              />
            </div>
          );
        },
      },
    ];
    if (dialogId !== 'all') {
      const extraOperations = {
        key: 'buttons',
        name: '',
        minWidth: 50,
        maxWidth: 50,
        isResizable: true,
        fieldName: 'buttons',
        data: 'string',
        onRender: (item) => {
          const isSourceSectionInDialog = item.fileId.endsWith('.source') && !dialogId.endsWith('.source');
          const isAllowEdit = dialogId !== 'all' && !isSourceSectionInDialog;

          return (
            <IconButton
              ariaLabel="Delete"
              hidden={!isAllowEdit}
              iconProps={{ iconName: 'Delete' }}
              style={{ visibility: isAllowEdit ? 'visible' : 'hidden' }}
              styles={icon}
              title="Delete"
              onClick={() => {
                deleteQnASection(item.sectionId);
              }}
            />
          );
        },
      };
      tableColums.splice(3, 0, extraOperations);
    }

    // all view, show used in column
    if (dialogId === 'all') {
      const beenUsedColumn = {
        key: 'usedIn',
        name: formatMessage('Used In'),
        fieldName: 'usedIn',
        minWidth: 100,
        maxWidth: 100,
        isResizable: true,
        isCollapsable: true,
        data: 'string',
        onRender: (item) => {
          return (
            <div data-is-focusable css={formCell}>
              <div aria-label={formatMessage(`id is {id}`, { id: item.dialogId })} css={content} tabIndex={-1}>
                {item.dialogId}
              </div>
            </div>
          );
        },
      };
      tableColums.splice(3, 0, beenUsedColumn);
    }
    return tableColums;
  };

  const getGroups = (): IGroup[] | undefined => {
    if (dialogId === 'all' || dialogId.endsWith('.source') || !qnaFile) {
      return undefined;
    }
    const groups: IGroup[] = [
      {
        key: dialogId,
        name: activeDialog?.displayName || dialogId,
        startIndex: 0,
        count: qnaSections.length,
        level: 0,
      },
    ];
    importedSourceFiles.forEach((currentFile) => {
      const lastGroup = groups[groups.length - 1];
      const startIndex = lastGroup.startIndex + lastGroup.count;
      const { id, qnaSections } = currentFile;
      const name = getBaseName(id);
      groups.push({ key: id, name, startIndex, count: qnaSections.length, level: 0 });
    });

    return groups;
  };

  const onRenderDetailsHeader = useCallback(
    (props, defaultRender) => {
      return (
        <div data-testid="tableHeader">
          <Sticky isScrollSynced stickyPosition={StickyPositionType.Header}>
            {defaultRender({
              ...props,
              onRenderColumnHeaderTooltip: (tooltipHostProps) => <TooltipHost {...tooltipHostProps} />,
            })}
          </Sticky>
        </div>
      );
    },
    [dialogId]
  );

  const onRenderRow = (props) => {
    if (props) {
      return <DetailsRow {...props} styles={rowDetails} tabIndex={props.itemIndex} />;
    }
    return null;
  };

  return (
    <div data-testid={'table-view'}>
      <ScrollablePane scrollbarVisibility={ScrollbarVisibility.auto}>
        <DetailsList
          checkboxVisibility={CheckboxVisibility.hidden}
          columns={getTableColums()}
          getKey={getKeyCallback}
          groupProps={{
            onRenderHeader: onRenderGroupHeader,
          }}
          groups={getGroups()}
          initialFocusedIndex={focusedIndex}
          items={[...qnaSections, ...importedSourceFileSections]}
          layoutMode={DetailsListLayoutMode.justified}
          selectionMode={SelectionMode.single}
          onRenderDetailsHeader={onRenderDetailsHeader}
          onRenderRow={onRenderRow}
        />
      </ScrollablePane>
    </div>
  );
};

export default TableView;
